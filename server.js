/* ============================================================
   HOMEY BACKEND
   - serves the app in /frontend
   - answers the requests sent by frontend/js/api.js (/api/...)
   - reads and writes the SQLite database database/homey.db
   Run it with:  npm start     then open  http://localhost:3000
   ============================================================ */
"use strict";
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));        // SQLite is built into Node.js 22 and newer
} catch (err) {
  console.error("This project needs Node.js 22 or newer (it uses the SQLite built into Node).");
  console.error("You have " + process.version + ". Install the LTS version from https://nodejs.org and try again.");
  process.exit(1);
}
const express = require("express");

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(ROOT, "database", "homey.db");
const UPLOADS = path.join(ROOT, "uploads");
fs.mkdirSync(UPLOADS, { recursive: true });

/* ---------- 1. the database ---------- */
const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA foreign_keys = ON;");                  // make SQLite enforce the links between tables

const hasTables = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'sellers'").get().n > 0;
if (!hasTables) {                                      // no database file yet: build it from the two SQL files
  db.exec(fs.readFileSync(path.join(ROOT, "database", "schema.sql"), "utf8"));
  db.exec(fs.readFileSync(path.join(ROOT, "database", "seed.sql"), "utf8"));
  console.log("Created the database from database/schema.sql and database/seed.sql");
}

/* ---------- 2. helpers ---------- */
const get = (sql, params) => db.prepare(sql).get(params || {});
const all = (sql, params) => db.prepare(sql).all(params || {});
const run = (sql, params) => db.prepare(sql).run(params || {});
const isoToText = (v) => v || "";

/* database rows (snake_case) -> the objects the pages expect (camelCase) */
const toUser = (r) => ({ id: r.user_id, name: r.name, email: r.email, role: r.user_role, sellerId: r.seller_id });

const SELLER_SQL =
  "SELECT s.seller_id, s.name, s.category, s.city, s.photo_url, s.about, " +
  "(SELECT COUNT(*) FROM listings l WHERE l.seller_id = s.seller_id) AS dish_count, " +
  "(SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.seller_id = s.seller_id) AS rating, " +
  "(SELECT COUNT(*) FROM reviews r WHERE r.seller_id = s.seller_id) AS review_count FROM sellers s";
const toSeller = (r) => ({ id: r.seller_id, name: r.name, category: r.category || "", city: r.city, photo: r.photo_url || "",
                           about: r.about || "", dishCount: r.dish_count, rating: r.rating || 0, reviewCount: r.review_count });

const FINAL_PRICE = "ROUND(l.price * (100 - l.discount) / 100.0, 2)";
const LISTING_SQL =
  "SELECT l.listing_id, l.seller_id, l.name, l.category, l.price, l.discount, " + FINAL_PRICE + " AS final_price, " +
  "l.description, l.photo_url, COALESCE(NULLIF(l.city, ''), s.city) AS city, l.available, s.name AS seller_name, " +
  "(SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.seller_id = s.seller_id) AS seller_rating, " +
  "(SELECT COUNT(*) FROM reviews r WHERE r.seller_id = s.seller_id) AS seller_reviews " +
  "FROM listings l JOIN sellers s ON s.seller_id = l.seller_id";
const toListing = (r) => ({ id: r.listing_id, sellerId: r.seller_id, name: r.name, category: r.category, price: r.price,
                            discount: r.discount, finalPrice: r.final_price, description: r.description || "", photo: r.photo_url || "",
                            city: r.city || "", available: !!r.available, sellerName: r.seller_name,
                            sellerRating: r.seller_rating || 0, sellerReviews: r.seller_reviews });

const ORDER_SQL =
  "SELECT o.order_id, o.customer_id, u.name AS customer_name, o.listing_id, o.dish_name, o.seller_id, s.name AS seller_name, " +
  "o.price, o.status, o.created_at, r.rating AS rating, r.comment AS rating_comment, (r.review_id IS NOT NULL) AS rated " +
  "FROM orders o JOIN users u ON u.user_id = o.customer_id JOIN sellers s ON s.seller_id = o.seller_id " +
  "LEFT JOIN reviews r ON r.order_id = o.order_id";
const toOrder = (r) => ({ id: r.order_id, customerId: r.customer_id, customerName: r.customer_name, listingId: r.listing_id,
                          dishName: r.dish_name, sellerId: r.seller_id, sellerName: r.seller_name, price: r.price, status: r.status,
                          date: isoToText(r.created_at), rated: !!r.rated, rating: r.rating || 0, ratingComment: r.rating_comment || "" });

const REVIEW_SQL = "SELECT r.review_id, r.seller_id, u.name AS customer_name, r.rating, r.comment, r.created_at " +
                   "FROM reviews r JOIN users u ON u.user_id = r.customer_id";
const toReview = (r) => ({ id: r.review_id, sellerId: r.seller_id, customer: r.customer_name, rating: r.rating,
                           comment: r.comment || "", date: isoToText(r.created_at) });

const MESSAGE_SQL =
  "SELECT m.message_id, m.customer_id, u.name AS customer_name, m.seller_id, s.name AS seller_name, m.listing_id, " +
  "l.name AS listing_name, m.text, m.created_at, m.seller_read, m.reply, m.replied_at, m.customer_read " +
  "FROM messages m JOIN users u ON u.user_id = m.customer_id JOIN sellers s ON s.seller_id = m.seller_id " +
  "LEFT JOIN listings l ON l.listing_id = m.listing_id";
const toMessage = (r) => ({ id: r.message_id, customerId: r.customer_id, customerName: r.customer_name, sellerId: r.seller_id,
                            sellerName: r.seller_name, dishId: r.listing_id || 0, dishName: r.listing_name || "", text: r.text,
                            date: isoToText(r.created_at), read: !!r.seller_read, reply: r.reply || "",
                            replyDate: isoToText(r.replied_at), replyRead: !!r.customer_read });

/* passwords are stored hashed (scrypt with a random salt), never as plain text */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return "scrypt$" + salt.toString("hex") + "$" + crypto.scryptSync(password, salt, 64).toString("hex");
}
function checkPassword(password, stored) {
  const parts = String(stored).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  return crypto.timingSafeEqual(crypto.scryptSync(password, Buffer.from(parts[1], "hex"), expected.length), expected);
}
function startSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  run("INSERT INTO sessions (token, user_id) VALUES (:token, :userId)", { token: token, userId: userId });
  return token;
}

/* a photo arrives as text (a data URL); save it as a file and keep only its path in the database */
function savePhoto(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const file = "listing-" + crypto.randomBytes(8).toString("hex") + "." + (m[1] === "jpeg" ? "jpg" : m[1]);
  fs.writeFileSync(path.join(UPLOADS, file), Buffer.from(m[2], "base64"));
  return "uploads/" + file;
}

const text = (v) => String(v === undefined || v === null ? "" : v).trim();
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const fail = (res, status, message) => res.status(status).json({ ok: false, error: message });

/* who is making this request? (the page sends the login token in the Authorization header) */
function userFromRequest(req) {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token ? get("SELECT u.* FROM sessions s JOIN users u ON u.user_id = s.user_id WHERE s.token = :token", { token: token }) : null;
}
function requireLogin(role) {
  return (req, res, next) => {
    const user = userFromRequest(req);
    if (!user) return fail(res, 401, "Please log in.");
    if (role && user.user_role !== role) return fail(res, 403, role === "seller" ? "Only sellers can do this." : "Only customers can do this.");
    req.user = user;
    next();
  };
}
const asSeller = requireLogin("seller");
const asCustomer = requireLogin("customer");

/* a seller works on their own dishes, orders and messages only */
function ownListing(req, res) {
  const l = get("SELECT * FROM listings WHERE listing_id = :id", { id: Number(req.params.id) });
  if (!l) { fail(res, 404, "Dish not found."); return null; }
  if (l.seller_id !== req.user.seller_id) { fail(res, 403, "This is not your dish."); return null; }
  return l;
}
const listingById = (id) => toListing(get(LISTING_SQL + " WHERE l.listing_id = :id", { id: id }));

/* ---------- 3. accounts ---------- */
const app = express();
app.use(express.json({ limit: "8mb" }));

app.post("/api/login", (req, res) => {
  const b = req.body || {};
  const user = get("SELECT * FROM users WHERE email = :email", { email: text(b.email) });
  if (!user || !checkPassword(String(b.password || ""), user.password_hash)) return res.json({ ok: false });
  res.json({ ok: true, user: toUser(user), token: startSession(user.user_id) });
});

app.post("/api/register", (req, res) => {
  const b = req.body || {};
  if (!text(b.name) || !text(b.email) || !String(b.password || "")) return res.json({ ok: false, error: "missing" });
  try {
    const result = run("INSERT INTO users (name, email, password_hash, user_role) VALUES (:name, :email, :hash, :role)", {
      name: text(b.name), email: text(b.email), hash: hashPassword(String(b.password)), role: text(b.role) });
    const user = get("SELECT * FROM users WHERE user_id = :id", { id: Number(result.lastInsertRowid) });
    res.json({ ok: true, user: toUser(user), token: startSession(user.user_id) });
  } catch (err) {                                       // the email is already used (UNIQUE rule), or the role is not allowed (CHECK rule)
    res.json({ ok: false, error: "exists" });
  }
});

app.get("/api/me", requireLogin(), (req, res) => res.json({ ok: true, user: toUser(req.user) }));

app.post("/api/logout", requireLogin(), (req, res) => {
  run("DELETE FROM sessions WHERE token = :token", { token: (req.get("Authorization") || "").slice(7) });
  res.json({ ok: true });
});

/* the little number in the menu: new questions for a seller, new replies for a customer */
app.get("/api/badges", (req, res) => {
  const user = userFromRequest(req);
  let count = 0;
  if (user && user.user_role === "seller" && user.seller_id)
    count = get("SELECT COUNT(*) AS n FROM messages WHERE seller_id = :id AND seller_read = 0", { id: user.seller_id }).n;
  else if (user && user.user_role === "customer")
    count = get("SELECT COUNT(*) AS n FROM messages WHERE customer_id = :id AND reply IS NOT NULL AND customer_read = 0", { id: user.user_id }).n;
  res.json({ count: count });
});

/* ---------- 4. browsing: sellers, dishes, search and filters (stories 1, 3, 6, 7, 8) ---------- */
app.get("/api/sellers", (req, res) => {
  const city = text(req.query.city) || null;
  res.json(all(SELLER_SQL + " WHERE (:city IS NULL OR s.city = :city) ORDER BY s.seller_id", { city: city }).map(toSeller));
});

app.get("/api/sellers/:id", (req, res) => {                // a seller's profile: details, dishes and reviews
  const id = Number(req.params.id);
  const seller = get(SELLER_SQL + " WHERE s.seller_id = :id", { id: id });
  if (!seller) return fail(res, 404, "Seller not found.");
  res.json({
    seller: toSeller(seller),
    listings: all(LISTING_SQL + " WHERE l.seller_id = :id ORDER BY l.listing_id", { id: id }).map(toListing),
    reviews: all(REVIEW_SQL + " WHERE r.seller_id = :id ORDER BY r.review_id DESC", { id: id }).map(toReview)
  });
});

app.get("/api/listings", (req, res) => {                   // search by name, filter by category and price
  const rows = all(
    LISTING_SQL + " WHERE (:q IS NULL OR instr(LOWER(l.name), LOWER(:q)) > 0)" +
    " AND (:category IS NULL OR l.category = :category)" +
    " AND (:min IS NULL OR " + FINAL_PRICE + " >= :min) AND (:max IS NULL OR " + FINAL_PRICE + " <= :max)" +
    " ORDER BY l.listing_id", {
      q: text(req.query.q) || null, category: text(req.query.category) || null,
      min: req.query.min === undefined || req.query.min === "" ? null : num(req.query.min),
      max: req.query.max === undefined || req.query.max === "" ? null : num(req.query.max) });
  res.json(rows.map(toListing));
});

app.get("/api/listings/:id", (req, res) => {
  const row = get(LISTING_SQL + " WHERE l.listing_id = :id", { id: Number(req.params.id) });
  if (!row) return fail(res, 404, "Dish not found.");
  res.json(toListing(row));
});

/* ---------- 5. customer: orders, tracking and rating (stories 2, 15, 16) ---------- */
app.post("/api/orders", asCustomer, (req, res) => {
  const l = get("SELECT * FROM listings WHERE listing_id = :id", { id: Number((req.body || {}).listingId) });
  if (!l) return fail(res, 404, "Dish not found.");
  if (!l.available) return fail(res, 409, "This dish is not available right now.");
  const result = run(                                      // the price comes from the database, with any discount applied
    "INSERT INTO orders (customer_id, listing_id, seller_id, dish_name, price) " +
    "VALUES (:customer, :listing, :seller, :dish, ROUND(:price * (100 - :discount) / 100.0, 2))", {
      customer: req.user.user_id, listing: l.listing_id, seller: l.seller_id, dish: l.name, price: l.price, discount: l.discount });
  res.json({ ok: true, order: toOrder(get(ORDER_SQL + " WHERE o.order_id = :id", { id: Number(result.lastInsertRowid) })) });
});

app.get("/api/orders/mine", asCustomer, (req, res) => {
  res.json(all(ORDER_SQL + " WHERE o.customer_id = :id ORDER BY o.order_id DESC", { id: req.user.user_id }).map(toOrder));
});

app.post("/api/orders/:id/received", asCustomer, (req, res) => {
  const o = get("SELECT * FROM orders WHERE order_id = :id", { id: Number(req.params.id) });
  if (!o || o.customer_id !== req.user.user_id) return fail(res, 404, "Order not found.");
  if (o.status !== "Ready") return fail(res, 409, "This order is not ready yet.");
  run("UPDATE orders SET status = 'Received' WHERE order_id = :id", { id: o.order_id });
  res.json({ ok: true });
});

app.post("/api/orders/:id/rate", asCustomer, (req, res) => {
  const b = req.body || {};
  const o = get("SELECT * FROM orders WHERE order_id = :id", { id: Number(req.params.id) });
  if (!o || o.customer_id !== req.user.user_id) return fail(res, 404, "Order not found.");
  if (o.status !== "Received") return fail(res, 409, "You can rate a seller after you receive your order.");
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(res, 400, "Choose 1 to 5 stars.");
  try {
    run("INSERT INTO reviews (seller_id, customer_id, order_id, rating, comment) VALUES (:seller, :customer, :order, :rating, :comment)", {
      seller: o.seller_id, customer: req.user.user_id, order: o.order_id, rating: rating, comment: text(b.comment) });
  } catch (err) { return fail(res, 409, "You already rated this order."); }   // one review per order (UNIQUE rule)
  res.json({ ok: true });
});

/* ---------- 6. contact a seller and the replies (story 9) ---------- */
app.post("/api/messages", asCustomer, (req, res) => {
  const b = req.body || {};
  const sellerId = Number(b.sellerId), listingId = Number(b.listingId) || null;
  if (!get("SELECT 1 AS ok FROM sellers WHERE seller_id = :id", { id: sellerId })) return fail(res, 404, "Seller not found.");
  if (listingId && !get("SELECT 1 AS ok FROM listings WHERE listing_id = :l AND seller_id = :s", { l: listingId, s: sellerId })) return fail(res, 400, "That dish is not sold by this seller.");
  if (!text(b.text)) return fail(res, 400, "Write your message first.");
  run("INSERT INTO messages (customer_id, seller_id, listing_id, text) VALUES (:customer, :seller, :listing, :text)", {
    customer: req.user.user_id, seller: sellerId, listing: listingId, text: text(b.text) });
  res.json({ ok: true });
});

app.get("/api/messages/mine", asCustomer, (req, res) => {
  res.json(all(MESSAGE_SQL + " WHERE m.customer_id = :id ORDER BY m.message_id DESC", { id: req.user.user_id }).map(toMessage));
});
app.post("/api/messages/mine/read", asCustomer, (req, res) => {           // the customer has seen the replies
  run("UPDATE messages SET customer_read = 1 WHERE customer_id = :id", { id: req.user.user_id });
  res.json({ ok: true });
});

app.get("/api/seller/messages", asSeller, (req, res) => {
  res.json(all(MESSAGE_SQL + " WHERE m.seller_id = :id ORDER BY m.message_id DESC", { id: req.user.seller_id || 0 }).map(toMessage));
});
app.post("/api/seller/messages/read", asSeller, (req, res) => {           // the seller has opened the questions
  run("UPDATE messages SET seller_read = 1 WHERE seller_id = :id", { id: req.user.seller_id || 0 });
  res.json({ ok: true });
});
app.post("/api/messages/:id/reply", asSeller, (req, res) => {
  const m = get("SELECT * FROM messages WHERE message_id = :id", { id: Number(req.params.id) });
  if (!m || m.seller_id !== req.user.seller_id) return fail(res, 404, "Question not found.");
  if (m.reply) return fail(res, 409, "You already replied to this question.");
  const reply = text((req.body || {}).text);
  if (!reply) return fail(res, 400, "Write your reply first.");
  run("UPDATE messages SET reply = :reply, replied_at = CURRENT_TIMESTAMP, customer_read = 0, seller_read = 1 WHERE message_id = :id",
      { reply: reply, id: m.message_id });
  res.json({ ok: true });
});

/* ---------- 7. seller: my dishes (stories 4, 10, 11, 12, 13, 14) ---------- */
app.get("/api/seller/dishes", asSeller, (req, res) => {
  res.json(all(LISTING_SQL + " WHERE l.seller_id = :id ORDER BY l.listing_id", { id: req.user.seller_id || 0 }).map(toListing));
});

app.post("/api/listings", asSeller, (req, res) => {
  const b = req.body || {};
  const city = text(b.city), photoUrl = savePhoto(b.photo);
  try {
    db.exec("BEGIN");
    let sellerId = req.user.seller_id;
    if (!sellerId) {                                      // a new seller gets a shop with the first dish
      sellerId = Number(run("INSERT INTO sellers (name, category, city, about) VALUES (:name, NULL, :city, 'New on Homey.')",
        { name: req.user.name, city: city }).lastInsertRowid);
      run("UPDATE users SET seller_id = :sellerId WHERE user_id = :userId", { sellerId: sellerId, userId: req.user.user_id });
    }
    const id = Number(run(
      "INSERT INTO listings (seller_id, name, category, price, description, photo_url, city) " +
      "VALUES (:sellerId, :name, :category, :price, :description, :photo, :city)", {
        sellerId: sellerId, name: text(b.name), category: text(b.category) || "Other", price: Math.max(0, num(b.price) || 0),
        description: text(b.description), photo: photoUrl, city: city }).lastInsertRowid);
    db.exec("COMMIT");
    res.json({ ok: true, listing: listingById(id), sellerId: sellerId });
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch (e) { /* nothing to undo */ }
    fail(res, 500, "The dish could not be saved.");
  }
});

app.put("/api/listings/:id", asSeller, (req, res) => {       // edit a dish
  const l = ownListing(req, res); if (!l) return;
  const b = req.body || {};
  const photoUrl = savePhoto(b.photo) || l.photo_url;
  run("UPDATE listings SET name = :name, category = :category, price = :price, description = :description, city = :city, photo_url = :photo WHERE listing_id = :id", {
    name: text(b.name), category: text(b.category) || "Other", price: Math.max(0, num(b.price) || 0),
    description: text(b.description), city: text(b.city), photo: photoUrl, id: l.listing_id });
  res.json({ ok: true, listing: listingById(l.listing_id) });
});

app.delete("/api/listings/:id", asSeller, (req, res) => {    // delete a dish (orders keep its name and price)
  const l = ownListing(req, res); if (!l) return;
  run("DELETE FROM listings WHERE listing_id = :id", { id: l.listing_id });
  res.json({ ok: true });
});

app.patch("/api/listings/:id/availability", asSeller, (req, res) => {
  const l = ownListing(req, res); if (!l) return;
  run("UPDATE listings SET available = :a WHERE listing_id = :id", { a: (req.body || {}).available ? 1 : 0, id: l.listing_id });
  res.json({ ok: true, listing: listingById(l.listing_id) });
});

app.patch("/api/listings/:id/discount", asSeller, (req, res) => {
  const l = ownListing(req, res); if (!l) return;
  const d = Number((req.body || {}).discount);
  if (!Number.isInteger(d) || d < 0 || d > 90) return fail(res, 400, "Enter a whole number from 1 to 90 (or 0 to remove the discount).");
  run("UPDATE listings SET discount = :d WHERE listing_id = :id", { d: d, id: l.listing_id });
  res.json({ ok: true, listing: listingById(l.listing_id) });
});

/* ---------- 8. seller: orders received and reviews (stories 16, 17) ---------- */
app.get("/api/seller/orders", asSeller, (req, res) => {
  res.json(all(ORDER_SQL + " WHERE o.seller_id = :id ORDER BY o.order_id DESC", { id: req.user.seller_id || 0 }).map(toOrder));
});

app.post("/api/orders/:id/advance", asSeller, (req, res) => {   // Placed -> Preparing -> Ready
  const o = get("SELECT * FROM orders WHERE order_id = :id", { id: Number(req.params.id) });
  if (!o || o.seller_id !== req.user.seller_id) return fail(res, 404, "Order not found.");
  const next = { Placed: "Preparing", Preparing: "Ready" }[o.status];
  if (!next) return fail(res, 409, "This order cannot move forward.");
  run("UPDATE orders SET status = :status WHERE order_id = :id", { status: next, id: o.order_id });
  res.json({ ok: true, status: next });
});

app.get("/api/seller/reviews", asSeller, (req, res) => {
  const id = req.user.seller_id || 0;
  const reviews = all(REVIEW_SQL + " WHERE r.seller_id = :id ORDER BY r.review_id DESC", { id: id }).map(toReview);
  const sum = get("SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS n FROM reviews WHERE seller_id = :id", { id: id });
  res.json({ average: sum.avg || 0, count: sum.n, reviews: reviews });
});

app.use("/api", (req, res) => fail(res, 404, "Not found."));

/* ---------- 9. the app and the uploaded photos ---------- */
app.use("/uploads", express.static(UPLOADS));
app.use(express.static(path.join(ROOT, "frontend")));

app.use((err, req, res, next) => {                      // bad JSON, or a photo that is too large
  fail(res, err.status || 500, "The request could not be read.");
});

app.listen(PORT, () => {
  console.log("Homey is running at http://localhost:" + PORT);
  console.log("Press Ctrl+C to stop it.");
});
