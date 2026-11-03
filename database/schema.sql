-- Homey database (SQLite). Covers all 17 user stories.
PRAGMA foreign_keys = ON;

-- the shops
CREATE TABLE sellers (
  seller_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT,
  city       TEXT NOT NULL,
  photo_url  TEXT,
  about      TEXT
);

-- every account: customers and sellers
CREATE TABLE users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  user_role     TEXT NOT NULL CHECK (user_role IN ('customer', 'seller')),
  seller_id     INTEGER REFERENCES sellers (seller_id)
);

-- the dishes a shop sells (stories 4, 10, 11, 12, 13, 14)
CREATE TABLE listings (
  listing_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id   INTEGER NOT NULL REFERENCES sellers (seller_id),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Other',
  price       REAL NOT NULL,
  description TEXT,
  photo_url   TEXT,
  city        TEXT,
  available   INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  discount    INTEGER NOT NULL DEFAULT 0 CHECK (discount BETWEEN 0 AND 90)
);

-- orders (stories 2, 16). dish_name and price are kept as they were when the order was placed.
CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES users (user_id),
  listing_id  INTEGER REFERENCES listings (listing_id) ON DELETE SET NULL,
  seller_id   INTEGER NOT NULL REFERENCES sellers (seller_id),
  dish_name   TEXT NOT NULL,
  price       REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'Placed' CHECK (status IN ('Placed', 'Preparing', 'Ready', 'Received')),
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ratings and comments for a seller (stories 15, 17). One review per order.
CREATE TABLE reviews (
  review_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id   INTEGER NOT NULL REFERENCES sellers (seller_id),
  customer_id INTEGER NOT NULL REFERENCES users (user_id),
  order_id    INTEGER UNIQUE REFERENCES orders (order_id) ON DELETE SET NULL,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- questions from customers to sellers, and the sellers' replies (story 9)
CREATE TABLE messages (
  message_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id   INTEGER NOT NULL REFERENCES users (user_id),
  seller_id     INTEGER NOT NULL REFERENCES sellers (seller_id),
  listing_id    INTEGER REFERENCES listings (listing_id) ON DELETE SET NULL,
  text          TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seller_read   INTEGER NOT NULL DEFAULT 0 CHECK (seller_read IN (0, 1)),
  reply         TEXT,
  replied_at    TEXT,
  customer_read INTEGER NOT NULL DEFAULT 1 CHECK (customer_read IN (0, 1))
);

-- keeps a user logged in (and between server restarts)
CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users (user_id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
