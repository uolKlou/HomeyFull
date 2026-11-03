/* ============================================================
   HOMEY APP - the screens and what happens when you click.
   All data comes from the functions in api.js (which call the backend).
   ============================================================ */
(function () {
"use strict";
const $ = function (id) { return document.getElementById(id); };

const CITIES = ["Riyadh", "Jeddah", "Medinah"];
const CATEGORIES = ["Breakfast", "Main dishes", "Seafood", "Sweets", "Vegetarian", "Drinks", "Other"];
const CAT_COLOR = { "Breakfast": "#f6d98a", "Main dishes": "#e9b08f", "Seafood": "#a9d3e6", "Sweets": "#f2b8c6",
                    "Vegetarian": "#b8dca2", "Drinks": "#d9c6ee", "Other": "#e4dfd0" };
const STATUSES = ["Placed", "Preparing", "Ready", "Received"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ============================================================
   HELPERS
   ============================================================ */
function esc(t) {
  return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
}
function money(n) { const v = Math.round(Number(n) * 100) / 100; return "SAR " + (Number.isInteger(v) ? v : v.toFixed(2)); }
function fmtDate(s) {                                   // "2026-11-03 12:00:00" -> "Nov 3, 2026"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  return m ? MONTHS[Number(m[2]) - 1] + " " + Number(m[3]) + ", " + m[1] : "";
}
function stars(value, size) {
  const full = Math.round(value);
  let out = '<span class="stars" role="img" aria-label="' + (Math.round(value * 10) / 10) + ' out of 5 stars">';
  for (let i = 1; i <= 5; i++) {
    out += '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="' + (i <= full ? "#e0a800" : "#d8d2c2") + '"/></svg>';
  }
  return out + "</span>";
}
function ratingLine(avg, count) {
  if (!count) return '<span class="rating-line text-muted">No reviews yet</span>';
  return '<span class="rating-line">' + stars(avg, 16) + "<b>" + avg + "</b> (" + count + (count === 1 ? " review" : " reviews") + ")</span>";
}
function priceHtml(l) {
  if (!l.discount) return '<span class="price-new">' + money(l.price) + "</span>";
  return '<span class="price-old">' + money(l.price) + '</span><span class="price-new">' + money(l.finalPrice) + '</span> <span class="chip disc">-' + l.discount + "%</span>";
}
function svgUri(svg) { return "data:image/svg+xml;utf8," + encodeURIComponent(svg); }
function letterOf(name) { return (String(name).trim().charAt(0) || "?").toUpperCase().replace(/[<>&"']/g, "?"); }
function avatarFor(name) {
  return svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#fbf1cf"/><text x="60" y="78" font-family="Arial, sans-serif" font-size="56" font-weight="700" text-anchor="middle" fill="#311802">' + letterOf(name) + "</text></svg>");
}
function dishPic(l) {
  if (l.photo) return l.photo;
  const color = CAT_COLOR[l.category] || "#e4dfd0";
  return svgUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90"><rect width="120" height="90" fill="' + color + '"/><circle cx="60" cy="45" r="26" fill="#ffffff" fill-opacity="0.65"/><text x="60" y="56" font-family="Arial, sans-serif" font-size="30" font-weight="700" text-anchor="middle" fill="#311802">' + letterOf(l.name) + "</text></svg>");
}
function sellerPic(s) { return s.photo || avatarFor(s.name); }
function emptyBox(title, text) { return '<div class="empty-box"><h3>' + esc(title) + '</h3><p class="text-muted mb-0">' + esc(text) + "</p></div>"; }
function debounce(fn, ms) { let t = null; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

/* ============================================================
   STATE, SCREENS AND MENU
   ============================================================ */
const VIEWS = ["login", "signup", "browse", "seller", "order", "contact", "myorders", "myquestions", "mydishes", "dishform", "sellerorders", "sellermessages", "myreviews"];
const NAV_FOR = {
  guest: [["browse", "Chefs"]],
  customer: [["browse", "Chefs"], ["myorders", "My orders"], ["myquestions", "My questions"]],
  seller: [["mydishes", "My dishes"], ["sellerorders", "Orders"], ["sellermessages", "Messages"], ["myreviews", "Reviews"]]
};
const GROUP = { browse: "browse", seller: "browse", order: "browse", contact: "browse", myorders: "myorders", myquestions: "myquestions",
                mydishes: "mydishes", dishform: "mydishes", sellerorders: "sellerorders", sellermessages: "sellermessages", myreviews: "myreviews" };

let view = "login";
let me = null;
let pending = null;
let greeting = "";
let badgeCount = 0;
let noticeTimer = null;
const ctx = { tab: "sellers", sellerId: null, orderListing: null, orders: [], sellerOrders: [], dishes: [], messages: [],
              rateOrder: null, rateValue: 0, rateText: "", discountFor: null, deleteFor: null, replyFor: null, editId: null, photoData: null };

const notice = $("notice");
function say(message) {
  notice.textContent = message;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(function () { notice.hidden = true; }, 4500);
}

function renderNav() {
  const items = NAV_FOR[me ? me.role : "guest"];
  $("navList").innerHTML = items.map(function (it) {
    const n = (it[0] === "sellermessages" || it[0] === "myquestions") ? badgeCount : 0;
    const badge = n ? '<span class="nav-badge" aria-label="' + n + ' new">' + n + "</span>" : "";
    return '<li class="nav-item"><a class="nav-link' + (GROUP[view] === it[0] ? " active" : "") + '" href="#" data-act="go" data-view="' + it[0] + '">' + it[1] + badge + "</a></li>";
  }).join("");
  $("authLink").textContent = me ? "Log out" : (view === "login" ? "Register" : "Login");
}

async function refreshBadge() {                          // the little number next to Messages / My questions
  if (!me) { badgeCount = 0; return; }
  try {
    const n = await Api.badges();
    if (n !== badgeCount) { badgeCount = n; renderNav(); }
  } catch (err) { /* the menu simply keeps its last number */ }
}

function showView(name) {
  view = name;
  VIEWS.forEach(function (v) { $(v + "View").hidden = v !== name; });
  notice.hidden = true;
  renderNav();
  const menu = $("navbarNav"), toggler = document.querySelector(".navbar-toggler");
  if (menu) menu.classList.remove("show");               // on a phone, close the menu after choosing something
  if (toggler) toggler.setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
  refreshBadge();
}

function sessionEnded() {
  Api.clearSession(); me = null; pending = null; greeting = ""; badgeCount = 0;
  showView("login");
  say("Your session ended. Please log in again.");
}
function onError(err) {
  if (err && err.code === "session") { sessionEnded(); return; }
  say(err && err.message ? err.message : "Something went wrong. Please try again.");
}
/* runs an async action and shows a message if it fails */
function guard(promise) { return Promise.resolve(promise).catch(onError); }

/* the menu: which screen opens for each item */
function goTo(name) {
  if (name === "browse") return openBrowse();
  if (name === "myorders") return openMyOrders();
  if (name === "myquestions") return openMyQuestions();
  if (name === "mydishes") return openMyDishes();
  if (name === "sellerorders") return openSellerOrders();
  if (name === "sellermessages") return openSellerMessages();
  if (name === "myreviews") return openMyReviews();
  showView(name);
}
function goHome() { return me && me.role === "seller" ? openMyDishes() : openBrowse(); }
async function sellerBlocked() {                         // a seller does not browse sellers or order food
  if (me && me.role === "seller") {
    await openMyDishes();
    say("Sellers can’t order food. Log in as a customer to browse sellers and place orders.");
    return true;
  }
  return false;
}
function needRole(role, message) {
  if (me && me.role === role) return true;
  showView("login");
  say(message);
  return false;
}

/* ============================================================
   LOG IN, SIGN UP, LOG OUT
   ============================================================ */
function afterAuth(u, isNew) {
  me = u;
  greeting = (isNew ? "Welcome, " : "Welcome back, ") + u.name + ".";
  if (pending) {
    const p = pending; pending = null;
    if (p.type === "order") return openOrder(p.listingId);
    if (p.type === "contact") return openContact(p.sellerId, p.dishId);
  }
  if (u.role === "seller") return openMyDishes().then(function () { say(greeting); });
  return openBrowse();
}

function logout() {
  Api.logout();
  me = null; pending = null; greeting = ""; badgeCount = 0;
  ctx.rateOrder = null; ctx.discountFor = null; ctx.deleteFor = null; ctx.replyFor = null;
  $("loginForm").reset();
  $("formError").hidden = true;
  $("emailError").textContent = ""; $("passwordError").textContent = "";
  showView("login");
  say("You have been logged out.");
}

$("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  guard((async function () {
    $("formError").hidden = true;
    const email = $("email").value.trim(), password = $("password").value;
    $("emailError").textContent = email ? "" : "Enter your email address.";
    $("passwordError").textContent = password ? "" : "Enter your password.";
    if (!email || !password) return;
    const d = await Api.login(email, password);
    if (!d.ok) { $("formError").textContent = "The email or password is wrong. Check them and try again."; $("formError").hidden = false; return; }
    $("loginForm").reset();
    await afterAuth(d.user, false);
  })());
});

function signupRole() { return $("signupForm").querySelector('input[name="role"]:checked').value; }
function updateSignupLabels() {
  const seller = signupRole() === "seller";
  $("sNameLabel").textContent = seller ? "Shop name" : "Your name";
  $("sNameHelp").hidden = !seller;
  $("signupBtn").textContent = seller ? "Create seller account" : "Create customer account";
  $("roleHint").textContent = seller ? "You will be able to list your dishes, set prices and discounts, and manage the orders you receive."
                                     : "You will be able to browse sellers, place orders, and rate sellers.";
}
$("signupForm").addEventListener("change", function (e) { if (e.target.name === "role") updateSignupLabels(); });

$("signupForm").addEventListener("submit", function (e) {
  e.preventDefault();
  guard((async function () {
    $("signupError").hidden = true;
    const name = $("sName").value.trim(), email = $("sEmail").value.trim(), password = $("sPassword").value;
    $("sNameError").textContent = name ? "" : (signupRole() === "seller" ? "Enter your shop name." : "Enter your name.");
    $("sEmailError").textContent = email ? "" : "Enter your email address.";
    $("sPasswordError").textContent = password ? "" : "Enter a password.";
    if (!name || !email || !password) return;
    const d = await Api.register({ name: name, email: email, password: password, role: signupRole() });
    if (!d.ok) {
      $("signupError").textContent = d.error === "exists" ? "This email already has an account. Log in, or use a different email." : "The account could not be created. Check your details and try again.";
      $("signupError").hidden = false;
      return;
    }
    $("signupForm").reset();
    updateSignupLabels();
    await afterAuth(d.user, true);
  })());
});

/* ============================================================
   BROWSE: sellers, dishes, search and filters (stories 1, 6, 7)
   ============================================================ */
function sellerCard(s) {
  const open = 'href="#" data-act="open-seller" data-id="' + s.id + '"';
  return '<div class="team-item col-md-4">' +
    '<div class="team-img mx-auto"><a ' + open + '><img class="rounded-circle w-100 h-100" src="' + esc(sellerPic(s)) + '" alt="' + esc(s.name) + '" style="object-fit: cover;"></a></div>' +
    '<div class="position-relative text-center bg-light rounded px-4 py-5" style="margin-top: -100px;">' +
      '<a ' + open + '><h3 class="font-weight-bold mt-5 mb-3 pt-5">' + esc(s.name) + "</h3></a>" +
      (s.category ? '<h6 class="text-uppercase text-muted mb-2">' + esc(s.category) + "</h6>" : "") +
      '<p class="mb-2">' + esc(s.city) + " &middot; " + s.dishCount + (s.dishCount === 1 ? " dish" : " dishes") + " available</p>" +
      '<p class="mb-3">' + ratingLine(s.rating, s.reviewCount) + "</p>" +
      '<a class="btn btn-primary px-4" ' + open + ">View menu</a>" +
    "</div></div>";
}

let sellersRequest = 0;
async function renderSellers() {
  const city = $("cityFilter").value;
  const mine = ++sellersRequest;
  const list = await Api.sellers(city);
  if (mine !== sellersRequest) return;                   // a newer choice was made while this one loaded
  $("sellerGrid").innerHTML = list.map(sellerCard).join("");
  $("sellerEmpty").hidden = list.length !== 0;
  $("sellerCount").textContent = list.length ? "Showing " + list.length + (list.length === 1 ? " seller" : " sellers") + (city ? " in " + city : " in all cities") : "";
}

function dishCard(l, opts) {
  opts = opts || {};
  return '<div class="col-md-6 col-lg-4 mb-4"><div class="bg-light rounded p-4 dish-card">' +
    '<img class="dish-img mb-3" src="' + esc(dishPic(l)) + '" alt="' + esc(l.name) + '">' +
    '<div class="mb-1"><span class="chip">' + esc(l.category || "Other") + "</span>" + (l.available ? "" : '<span class="chip off">Not available</span>') + "</div>" +
    '<h4 class="font-weight-bold">' + esc(l.name) + "</h4>" +
    (opts.showSeller ? '<p class="mb-1"><a href="#" data-act="open-seller" data-id="' + l.sellerId + '"><b>' + esc(l.sellerName) + "</b></a> &middot; " + esc(l.city) + "</p>" +
                       '<p class="mb-2">' + ratingLine(l.sellerRating, l.sellerReviews) + "</p>" : '<p class="text-muted mb-1">' + esc(l.city) + "</p>") +
    '<p class="text-muted grow">' + esc(l.description) + "</p>" +
    '<p class="mb-3">' + priceHtml(l) + "</p>" +
    (l.available ? '<button type="button" class="btn btn-primary" data-act="order" data-id="' + l.id + '">Order</button>'
                 : '<button type="button" class="btn btn-primary" disabled>Not available</button>') +
    '<a href="#" class="ask-link" data-act="contact" data-seller="' + l.sellerId + '" data-dish="' + l.id + '">Ask the seller about this dish</a>' +
  "</div></div>";
}

let dishesRequest = 0;
async function renderDishResults() {
  const mine = ++dishesRequest;
  const list = await Api.listings({ q: $("dishSearch").value.trim(), category: $("dishCategory").value, min: $("priceMin").value, max: $("priceMax").value });
  if (mine !== dishesRequest) return;
  $("dishGridAll").innerHTML = list.map(function (l) { return dishCard(l, { showSeller: true }); }).join("");
  $("dishEmpty").hidden = list.length !== 0;
  $("dishCount").textContent = list.length + (list.length === 1 ? " dish found" : " dishes found");
}

async function switchTab(tab) {
  ctx.tab = tab;
  $("tabSellers").hidden = tab !== "sellers";
  $("tabDishes").hidden = tab !== "dishes";
  $("tabBtnSellers").setAttribute("aria-selected", String(tab === "sellers"));
  $("tabBtnDishes").setAttribute("aria-selected", String(tab === "dishes"));
  if (tab === "sellers") await renderSellers(); else await renderDishResults();
}

async function openBrowse() {
  if (await sellerBlocked()) return;
  const g = $("greeting");
  g.hidden = !me;
  if (me) g.textContent = greeting;
  await switchTab(ctx.tab);
  showView("browse");
}

function clearFilters() {
  $("dishSearch").value = ""; $("dishCategory").value = ""; $("priceMin").value = ""; $("priceMax").value = "";
  return renderDishResults();
}

/* ============================================================
   SELLER PROFILE (story 8)
   ============================================================ */
function reviewHtml(r) {
  return '<div class="review"><div><span class="who">' + esc(r.customer) + "</span> &middot; " + stars(r.rating, 16) + ' <span class="when">' + esc(fmtDate(r.date)) + "</span></div>" +
         (r.comment ? '<p class="mb-0">' + esc(r.comment) + "</p>" : "") + "</div>";
}
async function openSeller(id) {
  if (await sellerBlocked()) return;
  const data = await Api.seller(id);
  if (!data) { say("This seller could not be found."); return; }
  const s = data.seller;
  ctx.sellerId = id;
  $("sellerPage").innerHTML =
    '<div class="seller-header"><img class="rounded-circle" src="' + esc(sellerPic(s)) + '" alt="' + esc(s.name) + '">' +
      '<div><h1 class="mb-1">' + esc(s.name) + '</h1><p class="text-muted mb-1">' + (s.category ? esc(s.category) + " &middot; " : "") + esc(s.city) + "</p>" + ratingLine(s.rating, s.reviewCount) + "</div></div>" +
    '<p class="about">' + esc(s.about) + "</p>" +
    '<button type="button" class="btn btn-primary" data-act="contact" data-seller="' + id + '">Contact seller</button>' +
    '<h2 class="section-h">Dishes (' + data.listings.length + ")</h2>" +
    (data.listings.length ? '<div class="row">' + data.listings.map(function (l) { return dishCard(l); }).join("") + "</div>" : emptyBox("No dishes yet", "This seller has not listed any dishes.")) +
    '<h2 class="section-h">Reviews (' + data.reviews.length + ")</h2>" +
    (data.reviews.length ? data.reviews.map(reviewHtml).join("") : emptyBox("No reviews yet", "Customers can rate this seller after they receive an order."));
  showView("seller");
}

/* ============================================================
   ORDER (story 2, with discounts and availability)
   ============================================================ */
async function openOrder(listingId) {
  if (await sellerBlocked()) return;
  if (!me) { pending = { type: "order", listingId: listingId }; showView("login"); say("Log in to place your order."); return; }
  const l = await Api.listing(listingId);
  if (!l) { say("This dish could not be found."); return; }
  if (!l.available) { say("This dish is not available right now."); return; }
  ctx.sellerId = l.sellerId; ctx.orderListing = listingId;
  $("orderItem").innerHTML = '<img src="' + esc(dishPic(l)) + '" alt="' + esc(l.name) + '">' +
    '<div><h4 class="font-weight-bold mb-1">' + esc(l.name) + '</h4><p class="text-muted mb-1">from ' + esc(l.sellerName) + '</p><p class="mb-0">' + priceHtml(l) + "</p></div>";
  $("orderForm").hidden = false; $("orderDone").hidden = true;
  showView("order");
}
async function confirmOrder() {
  if (!me || !ctx.orderListing) return;
  const d = await Api.placeOrder(ctx.orderListing);
  if (!d.ok) { say(d.error || "The order could not be placed. Try again."); return; }
  const o = d.order;
  $("orderDoneText").textContent = "Order #" + o.id + ": " + o.dishName + " from " + o.sellerName + ". Price: " + money(o.price) + ".";
  $("orderForm").hidden = true; $("orderDone").hidden = false;
}

/* ============================================================
   CONTACT A SELLER (story 9)
   ============================================================ */
async function openContact(sellerId, dishId) {
  if (await sellerBlocked()) return;
  if (!me) { pending = { type: "contact", sellerId: sellerId, dishId: dishId }; showView("login"); say("Log in to contact the seller."); return; }
  const data = await Api.seller(sellerId);
  if (!data) { say("This seller could not be found."); return; }
  ctx.sellerId = sellerId; ctx.contactSeller = data.seller.name;
  $("contactTitle").textContent = "Contact " + data.seller.name;
  $("contactDish").innerHTML = '<option value="0">A general question</option>' + data.listings.map(function (l) {
    return '<option value="' + l.id + '"' + (l.id === dishId ? " selected" : "") + ">" + esc(l.name) + "</option>";
  }).join("");
  $("contactMessage").value = ""; $("contactError").textContent = "";
  $("contactForm").hidden = false; $("contactDone").hidden = true;
  showView("contact");
}
$("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();
  guard((async function () {
    const text = $("contactMessage").value.trim();
    if (!text) { $("contactError").textContent = "Write your message first."; return; }
    const d = await Api.ask(ctx.sellerId, Number($("contactDish").value), text);
    if (!d.ok) { $("contactError").textContent = d.error || "The question could not be sent. Try again."; return; }
    $("contactDoneText").textContent = "Your question was sent to " + ctx.contactSeller + ". When they reply, you will see the answer in My questions.";
    $("contactForm").hidden = true; $("contactDone").hidden = false;
  })());
});

/* ============================================================
   CUSTOMER: MY QUESTIONS AND THE SELLERS' REPLIES (story 9)
   ============================================================ */
function aboutText(m) { return m.dishId ? (m.dishName ? "About: " + m.dishName : "About a dish that is no longer listed") : "A general question"; }
function questionCard(m) {
  const status = m.reply ? (m.replyRead ? '<span class="chip st-Ready">Answered</span>' : '<span class="chip new">New reply</span>') : '<span class="chip st-Preparing">Waiting for a reply</span>';
  const tail = m.reply ? '<div class="reply-box"><b>Reply from ' + esc(m.sellerName) + '</b><span class="when">' + esc(fmtDate(m.replyDate)) + '</span><p class="mb-0">' + esc(m.reply) + "</p></div>"
                       : '<p class="text-muted mb-0" style="margin-top:12px">' + esc(m.sellerName) + " has not replied yet.</p>";
  return '<div class="order-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;">' +
    '<h4 class="mb-0"><a href="#" data-act="open-seller" data-id="' + m.sellerId + '">' + esc(m.sellerName) + "</a></h4>" +
    '<div class="order-meta">' + status + '<span class="text-muted">' + esc(fmtDate(m.date)) + "</span></div></div>" +
    '<p class="text-muted mb-2">' + esc(aboutText(m)) + '</p><p class="mb-0">' + esc(m.text) + "</p>" + tail + "</div>";
}
async function openMyQuestions() {
  if (!needRole("customer", "Log in as a customer to see your questions.")) return;
  const list = await Api.myQuestions();
  $("myQuestionsList").innerHTML = list.length ? list.map(questionCard).join("") : emptyBox("No questions yet", "When you ask a seller a question, you can read their reply here.");
  await Api.markRepliesRead();                           // seen now, so the menu number goes away
  showView("myquestions");
}

/* ============================================================
   CUSTOMER: MY ORDERS, TRACKING AND RATING (stories 15, 16)
   ============================================================ */
function ratePanel(o) {
  let btns = "";
  for (let i = 1; i <= 5; i++) {
    btns += '<button type="button" data-act="rate-star" data-value="' + i + '" aria-label="' + i + (i === 1 ? " star" : " stars") + '" aria-pressed="' + (i <= ctx.rateValue) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="' + (i <= ctx.rateValue ? "#e0a800" : "#d8d2c2") + '"/></svg></button>';
  }
  return '<div class="panel"><p class="font-weight-bold mb-1">How was your order from ' + esc(o.sellerName) + "?</p>" +
    '<div class="star-input" role="group" aria-label="Your rating">' + btns + "</div>" +
    '<textarea class="form-control" id="rateText" placeholder="Tell other customers about your experience (optional)">' + esc(ctx.rateText) + "</textarea>" +
    '<div class="field-error" id="rateError" aria-live="polite"></div>' +
    '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="rate-submit" data-id="' + o.id + '">Submit rating</button>' +
    '<button type="button" class="btn-line" data-act="rate-cancel">Cancel</button></div></div>';
}
function orderCard(o) {
  const idx = STATUSES.indexOf(o.status);
  const steps = STATUSES.map(function (name, i) { return '<div class="step' + (i < idx ? " done" : "") + (i === idx ? " now" : "") + '">' + name + "</div>"; }).join("");
  let action = "";
  if (o.status === "Ready") action = '<button type="button" class="btn btn-primary" data-act="received" data-id="' + o.id + '">I received my order</button>';
  else if (o.status === "Received" && !o.rated) action = ctx.rateOrder === o.id ? ratePanel(o) : '<button type="button" class="btn btn-primary" data-act="rate-open" data-id="' + o.id + '">Rate this seller</button>';
  else if (o.rated) action = '<p class="mb-0">You rated ' + esc(o.sellerName) + " " + stars(o.rating, 16) + (o.ratingComment ? "<br><span class=\"text-muted\">“" + esc(o.ratingComment) + "”</span>" : "") + "</p>";
  else action = '<p class="text-muted mb-0">' + (o.status === "Placed" ? "The seller has your order." : "The seller is preparing your order.") + "</p>";
  return '<div class="order-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">' +
    '<div><h4>Order #' + o.id + '</h4><p class="mb-0">' + esc(o.dishName) + " from <a href=\"#\" data-act=\"open-seller\" data-id=\"" + o.sellerId + "\">" + esc(o.sellerName) + "</a></p></div>" +
    '<div class="order-meta"><span class="chip st-' + o.status + '">' + o.status + '</span><b>' + money(o.price) + "</b></div></div>" +
    '<div class="steps" aria-label="Order status: ' + o.status + '">' + steps + "</div>" + action + "</div>";
}
function renderMyOrders() {
  $("myOrdersList").innerHTML = ctx.orders.length ? ctx.orders.map(orderCard).join("") : emptyBox("No orders yet", "When you place an order, you can follow its status here.");
}
async function reloadMyOrders() { ctx.orders = await Api.myOrders(); renderMyOrders(); }
async function openMyOrders() {
  if (!needRole("customer", "Log in as a customer to see your orders.")) return;
  ctx.rateOrder = null;
  await reloadMyOrders(); showView("myorders");
}

/* ============================================================
   SELLER: ORDERS RECEIVED
   ============================================================ */
function renderSellerOrders() {
  $("sellerOrdersList").innerHTML = ctx.sellerOrders.length ? ctx.sellerOrders.map(function (o) {
    let action;
    if (o.status === "Placed") action = '<button type="button" class="btn btn-primary" data-act="advance" data-id="' + o.id + '">Start preparing</button>';
    else if (o.status === "Preparing") action = '<button type="button" class="btn btn-primary" data-act="advance" data-id="' + o.id + '">Mark as ready</button>';
    else if (o.status === "Ready") action = '<p class="text-muted mb-0">Waiting for the customer to collect it.</p>';
    else action = '<p class="text-muted mb-0">The customer received this order.</p>';
    return '<div class="order-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><div><h4>Order #' + o.id + "</h4><p class=\"mb-0\">" + esc(o.dishName) + " for " + esc(o.customerName) + "</p></div>" +
      '<div class="order-meta"><span class="chip st-' + o.status + '">' + o.status + '</span><b>' + money(o.price) + "</b></div></div><div style=\"margin-top:12px\">" + action + "</div></div>";
  }).join("") : emptyBox("No orders yet", "Orders from customers will appear here.");
}
async function reloadSellerOrders() { ctx.sellerOrders = await Api.sellerOrders(); renderSellerOrders(); }
async function openSellerOrders() {
  if (!needRole("seller", "Log in as a seller to see your orders.")) return;
  await reloadSellerOrders(); showView("sellerorders");
}

/* ============================================================
   SELLER: MY DISHES - availability, edit, delete, discount (stories 10, 12, 13, 14)
   ============================================================ */
function renderMyDishes() {
  $("myDishesList").innerHTML = ctx.dishes.length ? ctx.dishes.map(function (l) {
    let panel = "";
    if (ctx.discountFor === l.id) {
      panel = '<div class="panel"><p class="font-weight-bold mb-1">Discount for ' + esc(l.name) + '</p><div class="inline-field"><input type="number" class="form-control" id="discValue" min="1" max="90" value="' + (l.discount || "") + '" aria-label="Discount percent"> <span>% off</span>' +
        '<button type="button" class="btn btn-primary btn-sm" data-act="disc-apply" data-id="' + l.id + '">Apply</button>' +
        (l.discount ? '<button type="button" class="btn-line btn-sm" data-act="disc-remove" data-id="' + l.id + '">Remove discount</button>' : "") +
        '<button type="button" class="link-btn" data-act="disc-cancel">Cancel</button></div><div class="field-error" id="discError" aria-live="polite"></div></div>';
    }
    if (ctx.deleteFor === l.id) {
      panel += '<div class="panel"><p class="mb-2">Delete “' + esc(l.name) + '”? Customers will no longer see it, and this cannot be undone.</p><div class="row-actions" style="margin-top:0">' +
        '<button type="button" class="btn btn-sm btn-danger-line btn-line" data-act="delete-yes" data-id="' + l.id + '">Yes, delete it</button><button type="button" class="btn-line btn-sm" data-act="delete-no">Keep it</button></div></div>';
    }
    return '<div class="mrow"><img class="mpic" src="' + esc(dishPic(l)) + '" alt="' + esc(l.name) + '"><div class="mmain"><h4>' + esc(l.name) + "</h4>" +
      '<div><span class="chip">' + esc(l.category || "Other") + "</span> " + priceHtml(l) + "</div>" +
      '<button type="button" class="switch" role="switch" aria-checked="' + l.available + '" data-act="toggle-avail" data-id="' + l.id + '"><span class="track"></span><span>' + (l.available ? "Available" : "Not available") + "</span></button></div>" +
      '<div class="mactions"><button type="button" class="btn-line btn-sm" data-act="edit" data-id="' + l.id + '">Edit</button>' +
      '<button type="button" class="btn-line btn-sm" data-act="disc-open" data-id="' + l.id + '">' + (l.discount ? "Change discount" : "Add discount") + "</button>" +
      '<button type="button" class="btn-line btn-sm btn-danger-line" data-act="delete-ask" data-id="' + l.id + '">Delete</button></div>' + panel + "</div>";
  }).join("") : emptyBox("You have no dishes yet", "Add your first dish and it will appear on your shop page.");
}
async function reloadMyDishes() { ctx.dishes = await Api.myDishes(); renderMyDishes(); }
async function openMyDishes() {
  if (!needRole("seller", "Log in as a seller to manage your dishes.")) return;
  ctx.discountFor = null; ctx.deleteFor = null;
  await reloadMyDishes(); showView("mydishes");
}
function dishById(id) { return ctx.dishes.find(function (l) { return l.id === id; }); }

/* ---------- add or edit a dish ---------- */
function openDishForm(editId) {
  if (!needRole("seller", "Log in as a seller to add a dish.")) return;
  const l = editId ? dishById(editId) : null;
  ctx.editId = editId || null; ctx.photoData = null;
  $("formTitle").textContent = l ? "Edit dish" : "Add a dish";
  $("fSubmit").textContent = l ? "Save changes" : "Create dish";
  $("fCategory").innerHTML = '<option value="">Choose a category</option>' + CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
  $("fCity").innerHTML = '<option value="">Choose a city</option>' + CITIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
  $("dishForm").reset();
  $("fName").value = l ? l.name : ""; $("fCategory").value = l ? l.category : ""; $("fPrice").value = l ? l.price : "";
  $("fDesc").value = l ? l.description : ""; $("fCity").value = l ? l.city : "";
  $("fPreview").hidden = !(l && l.photo); if (l && l.photo) $("fPreview").src = l.photo;
  showView("dishform");
}

function shrink(dataUrl, done) {
  const img = new Image();
  img.onload = function () {
    try {
      const scale = Math.min(1, 700 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      done(c.toDataURL("image/jpeg", 0.8));
    } catch (err) { done(dataUrl); }
  };
  img.onerror = function () { done(dataUrl); };
  img.src = dataUrl;
}
$("fPhoto").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    shrink(reader.result, function (url) { ctx.photoData = url; $("fPreview").src = url; $("fPreview").hidden = false; });
  };
  reader.readAsDataURL(file);
});

$("dishForm").addEventListener("submit", function (e) {
  e.preventDefault();
  guard((async function () {
    const data = { name: $("fName").value.trim(), description: $("fDesc").value.trim(), category: $("fCategory").value || "Other",
                   city: $("fCity").value, price: Number($("fPrice").value) || 0 };
    if (ctx.photoData !== null) data.photo = ctx.photoData;
    let message;
    if (ctx.editId) {
      const d = await Api.updateDish(ctx.editId, data);
      if (!d.ok) { say(d.error || "Your changes could not be saved."); return; }
      message = "Your changes were saved.";
    } else {
      const d = await Api.createDish(data);
      if (!d.ok) { say(d.error || "The dish could not be saved."); return; }
      if (!me.sellerId) { me.sellerId = d.sellerId; Api.saveUser(me); }   // a new seller now has a shop
      message = "Your dish was added.";
    }
    await reloadMyDishes();
    showView("mydishes");
    say(message);
  })());
});

/* ============================================================
   SELLER: MESSAGES FROM CUSTOMERS AND REPLIES (story 9, seller side)
   ============================================================ */
function messageCard(m) {
  const status = !m.read ? '<span class="chip new">New</span>' : (m.reply ? '<span class="chip st-Ready">Answered</span>' : '<span class="chip st-Preparing">Needs a reply</span>');
  let tail;
  if (m.reply) tail = '<div class="reply-box"><b>Your reply</b><span class="when">' + esc(fmtDate(m.replyDate)) + '</span><p class="mb-0">' + esc(m.reply) + "</p></div>";
  else if (ctx.replyFor === m.id) tail = '<div class="panel"><label for="replyText" class="font-weight-bold mb-1">Your reply to ' + esc(m.customerName) + '</label>' +
    '<textarea class="form-control" id="replyText" placeholder="Write your answer"></textarea><div class="field-error" id="replyError" aria-live="polite"></div>' +
    '<div class="row-actions"><button type="button" class="btn btn-primary" data-act="reply-send" data-id="' + m.id + '">Send reply</button><button type="button" class="btn-line" data-act="reply-cancel">Cancel</button></div></div>';
  else tail = '<div class="row-actions"><button type="button" class="btn btn-primary btn-sm" data-act="reply-open" data-id="' + m.id + '">Reply</button></div>';
  return '<div class="order-box"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center;"><h4 class="mb-0">' + esc(m.customerName) + "</h4>" +
    '<div class="order-meta">' + status + '<span class="text-muted">' + esc(fmtDate(m.date)) + "</span></div></div>" +
    '<p class="text-muted mb-2">' + esc(aboutText(m)) + '</p><p class="mb-0">' + esc(m.text) + "</p>" + tail + "</div>";
}
function renderSellerMessages() {
  $("sellerMessagesList").innerHTML = ctx.messages.length ? ctx.messages.map(messageCard).join("") : emptyBox("No messages yet", "Questions from customers about your dishes will appear here.");
}
async function openSellerMessages() {
  if (!needRole("seller", "Log in as a seller to see your messages.")) return;
  ctx.replyFor = null;
  ctx.messages = await Api.sellerMessages();
  renderSellerMessages();                                 // the new ones are tagged "New" on this first view
  await Api.markQuestionsRead();                          // opened now, so they are no longer new
  ctx.messages.forEach(function (m) { m.read = true; });
  showView("sellermessages");
}

/* ============================================================
   SELLER: REVIEWS (story 17)
   ============================================================ */
async function openMyReviews() {
  if (!needRole("seller", "Log in as a seller to see your reviews.")) return;
  const data = await Api.sellerReviews();
  const reviews = data.reviews;
  let body;
  if (!reviews.length) body = emptyBox("No reviews yet", "Customers can rate your shop after they receive an order.");
  else {
    const bars = [5, 4, 3, 2, 1].map(function (n) {
      const c = reviews.filter(function (x) { return x.rating === n; }).length;
      return '<div class="bar-row"><span class="lbl">' + n + ' star' + (n === 1 ? "" : "s") + '</span><span class="bar-track"><span class="bar-fill" style="display:block;width:' + Math.round(c / reviews.length * 100) + '%"></span></span><span>' + c + "</span></div>";
    }).join("");
    body = '<div class="summary-box"><div><div class="big-rating">' + data.average + "</div>" + stars(data.average, 22) + '<p class="text-muted mb-0">' + data.count + (data.count === 1 ? " review" : " reviews") + '</p></div><div style="flex:1;min-width:220px">' + bars + "</div></div>" + reviews.map(reviewHtml).join("");
  }
  $("myReviewsBody").innerHTML = body;
  showView("myreviews");
}

/* ============================================================
   CLICKS AND INPUTS
   ============================================================ */
async function handleClick(el) {
  const act = el.dataset.act, id = Number(el.dataset.id);
  switch (act) {
    case "go": await goTo(el.dataset.view); break;
    case "tab": await switchTab(el.dataset.tab); break;
    case "clear-filters": await clearFilters(); break;
    case "open-seller": await openSeller(id); break;
    case "back-seller": if (ctx.sellerId) await openSeller(ctx.sellerId); else await openBrowse(); break;
    case "order": await openOrder(id); break;
    case "confirm-order": await confirmOrder(); break;
    case "contact": await openContact(Number(el.dataset.seller), Number(el.dataset.dish) || 0); break;
    case "received": {
      const d = await Api.markReceived(id);
      if (!d.ok) { say(d.error || "This order could not be updated."); break; }
      await reloadMyOrders(); say("Thanks! You can now rate this seller.");
      break;
    }
    case "rate-open": ctx.rateOrder = id; ctx.rateValue = 0; ctx.rateText = ""; renderMyOrders(); break;
    case "rate-cancel": ctx.rateOrder = null; renderMyOrders(); break;
    case "rate-star": { const t = $("rateText"); if (t) ctx.rateText = t.value; ctx.rateValue = Number(el.dataset.value); renderMyOrders(); break; }
    case "rate-submit": {
      const t = $("rateText"); if (t) ctx.rateText = t.value;
      if (!ctx.rateValue) { $("rateError").textContent = "Choose 1 to 5 stars."; break; }
      const d = await Api.rate(id, ctx.rateValue, ctx.rateText.trim());
      if (!d.ok) { $("rateError").textContent = d.error || "Your rating could not be saved."; break; }
      ctx.rateOrder = null; await reloadMyOrders(); say("Thank you for rating this seller.");
      break;
    }
    case "advance": {
      const d = await Api.advanceOrder(id);
      if (!d.ok) say(d.error || "This order could not be updated.");
      await reloadSellerOrders();
      break;
    }
    case "reply-open": ctx.replyFor = id; renderSellerMessages(); { const t = $("replyText"); if (t) t.focus(); } break;
    case "reply-cancel": ctx.replyFor = null; renderSellerMessages(); break;
    case "reply-send": {
      const text = $("replyText").value.trim();
      if (!text) { $("replyError").textContent = "Write your reply first."; break; }
      const m = ctx.messages.find(function (x) { return x.id === id; });
      const d = await Api.reply(id, text);
      if (!d.ok) { $("replyError").textContent = d.error || "Your reply could not be sent."; break; }
      ctx.replyFor = null;
      ctx.messages = await Api.sellerMessages(); ctx.messages.forEach(function (x) { x.read = true; });
      renderSellerMessages(); say("Your reply was sent to " + (m ? m.customerName : "the customer") + ".");
      break;
    }
    case "add-dish": openDishForm(null); break;
    case "edit": openDishForm(id); break;
    case "cancel-form": renderMyDishes(); showView("mydishes"); break;
    case "toggle-avail": { const l = dishById(id); await Api.setAvailable(id, !l.available); await reloadMyDishes(); break; }
    case "disc-open": ctx.discountFor = id; ctx.deleteFor = null; renderMyDishes(); break;
    case "disc-cancel": ctx.discountFor = null; renderMyDishes(); break;
    case "disc-apply": {
      const v = Number($("discValue").value);
      if (!Number.isInteger(v) || v < 1 || v > 90) { $("discError").textContent = "Enter a whole number from 1 to 90."; break; }
      const d = await Api.setDiscount(id, v);
      if (!d.ok) { $("discError").textContent = d.error || "The discount could not be saved."; break; }
      ctx.discountFor = null; await reloadMyDishes(); say("The discount was applied.");
      break;
    }
    case "disc-remove": await Api.setDiscount(id, 0); ctx.discountFor = null; await reloadMyDishes(); say("The discount was removed."); break;
    case "delete-ask": ctx.deleteFor = id; ctx.discountFor = null; renderMyDishes(); break;
    case "delete-no": ctx.deleteFor = null; renderMyDishes(); break;
    case "delete-yes": await Api.deleteDish(id); ctx.deleteFor = null; await reloadMyDishes(); say("The dish was deleted."); break;
  }
}
document.addEventListener("click", function (e) {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  e.preventDefault();
  guard(handleClick(el));
});

const searchDishes = debounce(function () { guard(renderDishResults()); }, 200);
$("dishSearch").addEventListener("input", searchDishes);
$("priceMin").addEventListener("input", searchDishes);
$("priceMax").addEventListener("input", searchDishes);
$("dishCategory").addEventListener("change", function () { guard(renderDishResults()); });
$("cityFilter").addEventListener("change", function () { guard(renderSellers()); });

$("authLink").addEventListener("click", function (e) {
  e.preventDefault();
  if (me) logout(); else showView(view === "login" ? "signup" : "login");
});
$("brandLink").addEventListener("click", function (e) { e.preventDefault(); if (me) guard(goHome()); else showView("login"); });
$("signupLink").addEventListener("click", function (e) { e.preventDefault(); showView("signup"); });
$("loginLink").addEventListener("click", function (e) { e.preventDefault(); showView("login"); });

/* ============================================================
   START
   ============================================================ */
CITIES.forEach(function (c) { const o = document.createElement("option"); o.value = c; o.textContent = c; $("cityFilter").appendChild(o); });
CATEGORIES.forEach(function (c) { const o = document.createElement("option"); o.value = c; o.textContent = c; $("dishCategory").appendChild(o); });
updateSignupLabels();
showView("login");

if (Api.hasSession()) {                                   // a refresh keeps you logged in
  guard(Api.me().then(function (u) {
    if (!u) { Api.clearSession(); return; }
    me = u; greeting = "Welcome back, " + u.name + ".";
    return goHome();
  }));
}
})();
