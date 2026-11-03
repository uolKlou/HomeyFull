/* ============================================================
   DATA ACCESS - the app gets all its data through the functions in this file.
   Each function sends a request to the backend (server.js), which reads and
   writes the SQLite database (database/homey.db). The screens never touch
   the database themselves.

   Who is logged in is kept in this browser tab (session storage), together
   with a login token that proves it to the backend.
   ============================================================ */
const Api = (function () {
  const TOKEN_KEY = "homey_token";
  const USER_KEY = "homey_user";

  function token() { try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch (err) { return ""; } }

  /* sends one request; returns { status, data } */
  async function call(method, url, body) {
    const headers = { "Content-Type": "application/json" };
    const t = token();
    if (t) headers["Authorization"] = "Bearer " + t;
    let res;
    try {
      res = await fetch("/api" + url, { method: method, headers: headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (err) {
      throw new Error("Could not reach the server. Make sure it is running, then try again.");
    }
    let data = null;
    try { data = await res.json(); } catch (err) { data = null; }
    if (res.status === 401 && t) { const e = new Error("Your session ended. Please log in again."); e.code = "session"; throw e; }
    return { status: res.status, data: data };
  }
  const list = (r) => (r.status === 200 && Array.isArray(r.data) ? r.data : []);
  const result = (r) => (r.data && typeof r.data === "object" ? r.data : { ok: false });
  const query = (obj) => Object.keys(obj).filter((k) => obj[k] !== "" && obj[k] !== null && obj[k] !== undefined)
    .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(obj[k])).join("&");

  function setSession(user, tok) {
    try { sessionStorage.setItem(TOKEN_KEY, tok); sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (err) { /* storage can be blocked */ }
  }
  function saveUser(user) { try { sessionStorage.setItem(USER_KEY, JSON.stringify(user)); } catch (err) { /* storage can be blocked */ } }
  function clearSession() { try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(USER_KEY); } catch (err) { /* nothing to clear */ } }

  return {
    /* ----- accounts ----- */
    hasSession: function () { return !!token(); },
    me: async function () { const r = await call("GET", "/me"); return r.status === 200 && r.data.ok ? r.data.user : null; },
    login: async function (email, password) {
      const d = result(await call("POST", "/login", { email: email, password: password }));
      if (d.ok) setSession(d.user, d.token);
      return d;
    },
    register: async function (data) {
      const d = result(await call("POST", "/register", data));
      if (d.ok) setSession(d.user, d.token);
      return d;
    },
    logout: function () { const had = !!token(); const p = had ? call("POST", "/logout").catch(function () { /* the server may be off */ }) : Promise.resolve(); clearSession(); return p; },
    saveUser: saveUser,
    clearSession: clearSession,
    badges: async function () { const r = await call("GET", "/badges"); return r.data && r.data.count ? r.data.count : 0; },

    /* ----- browsing: sellers, dishes, search, filters ----- */
    sellers: async function (city) { return list(await call("GET", "/sellers?" + query({ city: city }))); },
    seller: async function (id) { const r = await call("GET", "/sellers/" + encodeURIComponent(id)); return r.status === 200 ? r.data : null; },
    listings: async function (filters) { return list(await call("GET", "/listings?" + query(filters || {}))); },
    listing: async function (id) { const r = await call("GET", "/listings/" + encodeURIComponent(id)); return r.status === 200 ? r.data : null; },

    /* ----- customer: orders, ratings, questions ----- */
    placeOrder: async function (listingId) { return result(await call("POST", "/orders", { listingId: listingId })); },
    myOrders: async function () { return list(await call("GET", "/orders/mine")); },
    markReceived: async function (id) { return result(await call("POST", "/orders/" + id + "/received")); },
    rate: async function (id, rating, comment) { return result(await call("POST", "/orders/" + id + "/rate", { rating: rating, comment: comment })); },
    ask: async function (sellerId, listingId, text) { return result(await call("POST", "/messages", { sellerId: sellerId, listingId: listingId, text: text })); },
    myQuestions: async function () { return list(await call("GET", "/messages/mine")); },
    markRepliesRead: async function () { return result(await call("POST", "/messages/mine/read")); },

    /* ----- seller: dishes ----- */
    myDishes: async function () { return list(await call("GET", "/seller/dishes")); },
    createDish: async function (d) { return result(await call("POST", "/listings", d)); },
    updateDish: async function (id, d) { return result(await call("PUT", "/listings/" + id, d)); },
    deleteDish: async function (id) { return result(await call("DELETE", "/listings/" + id)); },
    setAvailable: async function (id, available) { return result(await call("PATCH", "/listings/" + id + "/availability", { available: available })); },
    setDiscount: async function (id, discount) { return result(await call("PATCH", "/listings/" + id + "/discount", { discount: discount })); },

    /* ----- seller: orders, questions, reviews ----- */
    sellerOrders: async function () { return list(await call("GET", "/seller/orders")); },
    advanceOrder: async function (id) { return result(await call("POST", "/orders/" + id + "/advance")); },
    sellerMessages: async function () { return list(await call("GET", "/seller/messages")); },
    markQuestionsRead: async function () { return result(await call("POST", "/seller/messages/read")); },
    reply: async function (id, text) { return result(await call("POST", "/messages/" + id + "/reply", { text: text })); },
    sellerReviews: async function () { const r = await call("GET", "/seller/reviews"); return r.status === 200 ? r.data : { average: 0, count: 0, reviews: [] }; }
  };
})();
