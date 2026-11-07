# Homey

A marketplace where people sell and buy homemade food. Customers find sellers, search for dishes, order and track their orders, ask sellers questions, and rate them. Sellers manage their dishes, receive orders, answer questions, and read their reviews.


## Live demo

Render address (https://homeyfull.onrender.com)

The hosted version runs on Render's free plan. It goes to sleep after about 15 minutes without visitors, and the first visit afterwards can take up to a minute to load. Whenever it restarts, the database goes back to the starting data stored in `database/homey.db`, so orders, questions and accounts created online are lost. Run it locally (below) to keep your data.

## Test accounts

| Role | Email | Password |
|---|---|---|
| Customer | sara@example.com | Test1234 |
| Seller | chef@example.com | Test1234 |

You can also press **Register** and create your own customer or seller account.

## Run it locally

You need **Node.js 22 or newer** (the LTS version from https://nodejs.org). SQLite is built into Node, so there is no database to install.

1. Open a terminal **inside this folder** (the one that contains `package.json`).
2. `npm install` (first time only, needs internet).
3. `npm start`
4. Open **http://localhost:3000** in Chrome or Edge.

Keep the terminal open while you use the system. Press `Ctrl + C` to stop it. A line saying "SQLite is an experimental feature" is normal.

## The database

The database file **`database/homey.db`** is included, so you can open it and look at the tables. Use **DB Browser for SQLite** (https://sqlitebrowser.org): Open Database, choose `database/homey.db`, then the Browse Data tab. For viewing only, use File, Open Database Read Only.

| Table | Holds | Stories |
|---|---|---|
| `sellers` | the shops: name, city, picture, about text | 1, 8 |
| `users` | accounts: email, hashed password, role (customer or seller), shop | 5 |
| `listings` | the dishes: price, category, photo, available (0/1), discount (0 to 90) | 3, 4, 10, 11, 12, 13, 14 |
| `orders` | orders, with the dish name and price at the time, and the status | 2, 16 |
| `reviews` | a seller's ratings (1 to 5) and comments, one per order | 15, 17 |
| `messages` | customers' questions to sellers, and the sellers' replies | 9 |
| `sessions` | who is logged in | 5 |

Rules the database enforces: one account per email, a role that is only `customer` or `seller`, ratings from 1 to 5, discounts from 0 to 90, one review per order, and every link between tables must point to something that exists (foreign keys). Passwords are stored hashed (scrypt), never as plain text. Uploaded photos are saved in `uploads/`, and only their path is stored.

**Starting over:** stop the server, delete `database/homey.db`, and run `npm start` again. The database is rebuilt from `database/schema.sql` and `database/seed.sql`. If you change the tables in `schema.sql`, delete `homey.db` too, because the schema only runs when the file does not exist.

The sample data has 12 shops, 25 dishes, 11 accounts , 5 orders, 16 reviews and 4 questions.

## How it fits together

```
the app (frontend/index.html)  ->  frontend/js/app.js  ->  frontend/js/api.js
      ->  requests to /api/...  ->  server.js  ->  SQL  ->  database/homey.db
```

- `frontend/js/api.js` is the only file that talks to the backend, one function for each thing the screens do.
- `server.js` checks who is asking, applies the rules, and runs the SQL.


## What each story does

| Story | Where |
|---|---|
| 1 Browse sellers near me | **Chefs**, Sellers tab, with a city picker |
| 2 Place an order | **Order** on a dish, then Confirm order |
| 3 View a listing's details | the dish cards: photo, description, price, location |
| 4 Create a listing | seller: **My dishes**, Add a dish |
| 5 Sign up and log in | **Register** (choose customer or seller) and **Login** |
| 6 Search by name | **Chefs**, Dishes tab, search box |
| 7 Filter by category or price | **Chefs**, Dishes tab, category and price fields |
| 8 Seller profile | click a seller: details, rating, dishes and reviews |
| 9 Contact a seller | **Contact seller** or "Ask the seller about this dish"; the seller answers under **Messages**; the customer reads it in **My questions** |
| 10 Availability | seller: the switch on each dish |
| 11 Category | the Category list when adding or editing a dish |
| 12 Delete a listing | seller: Delete (with a confirmation) |
| 13 Edit a listing | seller: Edit |
| 14 Discount | seller: Add discount; customers see the old and new price |
| 15 Rate a seller | customer: **My orders**, after "I received my order" |
| 16 Track an order | customer: **My orders** (Placed, Preparing, Ready, Received); seller: **Orders** moves it forward |
| 17 View reviews | seller: **Reviews** |

## The backend routes (server.js)

| Route | What it does |
|---|---|
| `POST /api/register`, `/api/login`, `/api/logout`; `GET /api/me`, `/api/badges` | accounts, and the new-message numbers in the menu |
| `GET /api/sellers`, `/api/sellers/:id` | shops (optionally by city), and one seller's profile |
| `GET /api/listings`, `/api/listings/:id` | dishes, with search, category and price filters |
| `POST /api/orders`; `GET /api/orders/mine`; `POST /api/orders/:id/received`, `/:id/rate` | customer: order, track, receive, rate |
| `POST /api/messages`; `GET /api/messages/mine`; `POST /api/messages/mine/read` | customer: questions and replies |
| `GET /api/seller/dishes`; `POST /api/listings`; `PUT`, `DELETE /api/listings/:id`; `PATCH /api/listings/:id/availability`, `/discount` | seller: manage dishes |
| `GET /api/seller/orders`; `POST /api/orders/:id/advance` | seller: orders |
| `GET /api/seller/messages`; `POST /api/seller/messages/read`; `POST /api/messages/:id/reply` | seller: questions and replies |
| `GET /api/seller/reviews` | seller: reviews |

## Deploying on Render

- Service type: Web Service, Free instance
- Build command: `npm install`
- Start command: `node server.js`
- Environment variable: `NODE_VERSION` = `24`

## Project folders

```
server.js          the backend
package.json       the project list (npm install reads this)
database/          schema.sql, seed.sql, and homey.db (the database itself)
frontend/          the app: index.html, css/, js/, fonts/, img/
uploads/           photos uploaded with new dishes
```
