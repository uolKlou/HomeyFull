-- Starting data for Homey: 12 shops, 25 dishes, 11 accounts, 5 orders, 16 reviews, 4 questions.
-- The two test accounts (sara@example.com and chef@example.com) use the password Test1234.
-- The other accounts are sample customers whose names appear in orders, reviews and questions; they cannot log in.

INSERT INTO sellers (seller_id, name, category, city, photo_url, about) VALUES
  (1, 'Sugar & Saffron', 'Sweets', 'Riyadh', 'img/sellers/1.jpg', 'Saudi sweets baked fresh every morning from my grandmother’s recipes.'),
  (2, 'The Warm Plate', 'Dinner', 'Riyadh', 'img/sellers/2.jpg', 'Home-style rice dishes and stews, cooked slowly and served warm.'),
  (3, 'Morning Basket', 'Breakfast', 'Riyadh', 'img/sellers/3.jpg', 'Traditional breakfast favorites, ready before work.'),
  (4, 'Blue Coast Kitchen', 'Sea food', 'Jeddah', 'img/sellers/4.jpg', 'Fresh catch from the Red Sea, cooked the Jeddah way.'),
  (5, 'Honey Date House', 'Sweets', 'Jeddah', 'img/sellers/5.jpg', 'Dates, honey and baked treats made in small batches.'),
  (6, 'Rice & Spice Kitchen', 'Dinner', 'Riyadh', 'img/sellers/6.jpg', 'Fragrant rice dishes with spice blends I mix myself.'),
  (7, 'Sunrise Pantry', 'Breakfast', 'Medinah', 'img/sellers/7.jpg', 'Simple breakfasts with fresh bread and local ingredients.'),
  (8, 'Desert Rose Kitchen', 'Dinner', 'Medinah', 'img/sellers/8.jpg', 'Hearty traditional dinners from the Medinah region.'),
  (9, 'The Sweet Corner', 'Sweets', 'Riyadh', 'img/sellers/9.jpg', 'Cakes and pastries for every celebration.'),
  (10, 'Green Basket', 'Vegetables', 'Jeddah', 'img/sellers/10.jpg', 'Fresh vegetarian dishes made with seasonal vegetables.'),
  (11, 'Olive & Thyme', 'Vegetables', 'Medinah', 'img/sellers/11.jpg', 'Mediterranean-style dips and stuffed vegetables.'),
  (12, 'Tamees & Tea', 'Breakfast', 'Riyadh', 'img/sellers/12.jpg', 'Warm tamees bread, eggs and fresh tea.');

INSERT INTO users (user_id, name, email, password_hash, user_role, seller_id) VALUES
  (1, 'Sara', 'sara@example.com', 'scrypt$91bd88d919494e0d1bab8b6aab21c8e9$88f4178bba0c8877df3a81ec20cae34f029b1490dbd5e533811b7ab334b8cdaccd3bf99a276964f2a8e18e0a880ac2537a64e459a289b8bf70a1fa36748b361f', 'customer', NULL),
  (2, 'Sugar & Saffron', 'chef@example.com', 'scrypt$ea87bd202d40d26a6e4b3b30ed53ef3c$1f14a4992eed061bde6f62980cdb74059f1eff0e423ac90805d88a86f4e8d673861ff9b494ec231d528464dac4b38739a81ca25c3c4ffb32307c74f0f2f1f6bf', 'seller', 1),
  (3, 'Layla', 'layla@example.com', 'scrypt$c6ea3b71d8c1ffc26107818467206695$7023198c0de7f086866ef7331d6cdf07b77ab393029d8587ee90039bf9f76852f4fb5a6c186db53afaf00b4a60ab27d3f4aa2532120541fd6dd98b8a2e0fc62d', 'customer', NULL),
  (4, 'Omar', 'omar@example.com', 'scrypt$55485444bf433295954779db879678eb$783196f15829590a40e9df846fcfda1b6407a6021cdb328bf7de5dea813e5cac35c1ad411a068cc50021888691f209177ebd18959dc099743a181c43a08ac928', 'customer', NULL),
  (5, 'Nora', 'nora@example.com', 'scrypt$f908ca3a884cb0eff22184820fa7d900$8e54498765d550062f195782e71c9d8e39311926c5b79aea24a118137f773c8b4b7dfcf717f227d75aff7777f2db42dcad37554fe2f3ddec0376d087db05561a', 'customer', NULL),
  (6, 'Khalid', 'khalid@example.com', 'scrypt$66cc5609a26aadeb35c4553463c0e932$c7725cb2cfe1d16f40b1c50b9e3f2ba38dc5e75ee984cde3c390bbbda9ca8360616418ba0a5038e3e30a5b0035c5564f8c821b09e4d9369ee5db25afec061127', 'customer', NULL),
  (7, 'Maha', 'maha@example.com', 'scrypt$f6b804cc193695110127555f8d486dde$84189a5d493053f85fc013452a388bb781591bb514ba0c8f2608c705ca4878cf5ceb9600bf682a0f66757ce58699e8fd4f33f6ebb45ea362cc89f235cb13fec6', 'customer', NULL),
  (8, 'Faisal', 'faisal@example.com', 'scrypt$0f2279f2085aaebc77d9e4c61e2eab77$c1c23076af375a38ca978a789b295d535c53bec92a3db088d2630c98626991ae179ca00d06b0b9d5a4242be0ac31c0f067c582bcdde34f1d03accd838c44d025', 'customer', NULL),
  (9, 'Dalal', 'dalal@example.com', 'scrypt$a2ba1484bdf2d20611c73e781d11b327$0f7eab2488c092d01fd33506bf44ca9dd27b1ab421c07291f33e8ebc8374664e7ba0abef77fbe250b1a67078cbf15c956d370323baf358d8eb593654184f6475', 'customer', NULL),
  (10, 'Reem', 'reem@example.com', 'scrypt$eec943412f11b423e5e207bfaf714631$9948caf1ea9dc5df9b68c2e0fa5675e7235a8301d4780ab855cdf50ba1f115758fd9f669ae877970c02bea7cc3307590ebff975318d9bc3e9224d57bbbfa8768', 'customer', NULL),
  (11, 'Yousef', 'yousef@example.com', 'scrypt$f8fbd182d58d4c6ee18920dfa397b681$b8b4511e58d7e47e002ea6cd24c33129bcf5a9b21841f2e863c957b1a2cafd1dff9e72ac22be32570c2c9f1d18ed3a2854f49b3a7e9bd3a8abdebbf681401b85', 'customer', NULL);

INSERT INTO listings (listing_id, seller_id, name, category, price, description, photo_url, city, available, discount) VALUES
  (1, 1, 'Date maamoul (12 pieces)', 'Sweets', 45, 'Soft semolina cookies filled with dates.', NULL, 'Riyadh', 1, 0),
  (2, 1, 'Luqaimat box', 'Sweets', 30, 'Crispy dumplings with date syrup.', NULL, 'Riyadh', 1, 20),
  (3, 2, 'Chicken kabsa', 'Main dishes', 55, 'Spiced rice with chicken, serves two.', NULL, 'Riyadh', 1, 0),
  (4, 2, 'Lamb mandi', 'Main dishes', 85, 'Slow-cooked lamb over smoky rice.', NULL, 'Riyadh', 0, 0),
  (5, 3, 'Foul with fresh bread', 'Breakfast', 18, 'Fava beans with olive oil and lemon.', NULL, 'Riyadh', 1, 0),
  (6, 3, 'Shakshuka pan', 'Breakfast', 25, 'Eggs in spiced tomato sauce.', NULL, 'Riyadh', 1, 0),
  (7, 4, 'Grilled hammour', 'Seafood', 70, 'Fresh fish with lemon and herbs.', NULL, 'Jeddah', 1, 15),
  (8, 4, 'Shrimp rice', 'Seafood', 60, 'Rice cooked with shrimp and tomato.', NULL, 'Jeddah', 1, 0),
  (9, 5, 'Basbousa tray', 'Sweets', 40, 'Semolina cake soaked in syrup.', NULL, 'Jeddah', 1, 0),
  (10, 5, 'Qatayef (10 pieces)', 'Sweets', 35, 'Stuffed pancakes with cream or nuts.', NULL, 'Jeddah', 1, 0),
  (11, 6, 'Margoog stew', 'Main dishes', 50, 'Vegetable and lamb stew with thin dough.', NULL, 'Riyadh', 1, 0),
  (12, 6, 'Saleeg', 'Main dishes', 48, 'Creamy rice cooked in broth with chicken.', NULL, 'Riyadh', 1, 0),
  (13, 7, 'Balaleet', 'Breakfast', 22, 'Sweet vermicelli topped with an omelette.', NULL, 'Medinah', 1, 0),
  (14, 7, 'Mutabbaq (4 pieces)', 'Breakfast', 28, 'Pan-fried stuffed pastry.', NULL, 'Medinah', 1, 0),
  (15, 8, 'Jareesh', 'Main dishes', 42, 'Crushed wheat cooked with yogurt and ghee.', NULL, 'Medinah', 1, 0),
  (16, 8, 'Harees', 'Main dishes', 45, 'Slow-cooked wheat and chicken porridge.', NULL, 'Medinah', 0, 0),
  (17, 9, 'Kunafa tray', 'Sweets', 65, 'Warm cheese pastry with syrup.', NULL, 'Riyadh', 1, 10),
  (18, 9, 'Date and coffee cake', 'Sweets', 38, 'Moist cake with Arabic coffee flavor.', NULL, 'Riyadh', 1, 0),
  (19, 10, 'Stuffed grape leaves', 'Vegetarian', 32, 'Rice and herb rolls, about 20 pieces.', NULL, 'Jeddah', 1, 0),
  (20, 10, 'Fattoush bowl', 'Vegetarian', 20, 'Fresh salad with crispy bread.', NULL, 'Jeddah', 1, 0),
  (21, 11, 'Hummus and mutabal set', 'Vegetarian', 24, 'Two dips with warm bread.', NULL, 'Medinah', 1, 0),
  (22, 11, 'Stuffed zucchini', 'Vegetarian', 36, 'Zucchini filled with spiced rice.', NULL, 'Medinah', 1, 0),
  (23, 12, 'Tamees bread with eggs', 'Breakfast', 20, 'Fresh tamees bread with cheese and eggs.', NULL, 'Riyadh', 1, 0),
  (24, 12, 'Cheese sambousek (12)', 'Breakfast', 30, 'Crispy cheese pastries, ready to fry.', NULL, 'Riyadh', 1, 0),
  (25, 12, 'Saffron karak tea (1 litre)', 'Drinks', 18, 'Strong spiced tea with milk and saffron.', NULL, 'Riyadh', 1, 0);

INSERT INTO orders (order_id, customer_id, listing_id, seller_id, dish_name, price, status, created_at) VALUES
  (1001, 1, 3, 2, 'Chicken kabsa', 55, 'Received', '2026-10-21 12:00:00'),
  (1002, 1, 1, 1, 'Date maamoul (12 pieces)', 45, 'Ready', '2026-11-02 12:00:00'),
  (1003, 1, 2, 1, 'Luqaimat box', 24, 'Preparing', '2026-11-03 09:00:00'),
  (1004, 3, 1, 1, 'Date maamoul (12 pieces)', 45, 'Placed', '2026-11-03 10:00:00'),
  (1005, 4, 2, 1, 'Luqaimat box', 24, 'Preparing', '2026-11-03 11:00:00');

INSERT INTO reviews (review_id, seller_id, customer_id, rating, comment, created_at) VALUES
  (1, 1, 5, 5, 'The maamoul tasted exactly like my grandmother’s. Fresh and not too sweet.', '2026-10-12 12:00:00'),
  (2, 1, 6, 5, 'Beautiful packaging and on time.', '2026-10-19 12:00:00'),
  (3, 1, 7, 4, 'Very good, I only wish the box was bigger.', '2026-10-24 12:00:00'),
  (4, 1, 8, 5, 'Best luqaimat in Riyadh.', '2026-10-30 12:00:00'),
  (5, 2, 9, 4, 'Generous portion and well spiced.', '2026-10-15 12:00:00'),
  (6, 2, 4, 5, 'The kabsa was perfect. I will order again.', '2026-10-21 12:00:00'),
  (7, 2, 10, 4, 'Tasty, a little late but worth the wait.', '2026-10-28 12:00:00'),
  (8, 3, 11, 5, 'Fresh bread and a lovely foul.', '2026-10-18 12:00:00'),
  (9, 3, 5, 4, 'Good breakfast, easy pickup.', '2026-10-26 12:00:00'),
  (10, 4, 6, 5, 'The hammour was very fresh.', '2026-10-22 12:00:00'),
  (11, 5, 7, 4, 'The basbousa was moist and delicious.', '2026-10-17 12:00:00'),
  (12, 5, 9, 3, 'Nice, but a bit too sweet for me.', '2026-10-27 12:00:00'),
  (13, 6, 4, 4, 'Fragrant rice, good value.', '2026-10-20 12:00:00'),
  (14, 9, 10, 5, 'The date cake was the star of our party.', '2026-10-23 12:00:00'),
  (15, 9, 8, 5, 'Beautiful kunafa, still warm.', '2026-10-29 12:00:00'),
  (16, 10, 11, 4, 'Fresh and light.', '2026-10-25 12:00:00');

INSERT INTO messages (message_id, customer_id, seller_id, listing_id, text, created_at, seller_read, reply, replied_at, customer_read) VALUES
  (1, 3, 1, 1, 'Does the maamoul contain nuts?', '2026-11-02 12:00:00', 0, NULL, NULL, 1),
  (2, 4, 1, 2, 'Can I pick up the luqaimat after 6 pm?', '2026-11-03 09:30:00', 0, NULL, NULL, 1),
  (3, 1, 1, 1, 'Can I get the maamoul in a gift box?', '2026-11-01 12:00:00', 1, 'Yes, I can pack it in a gift box at no extra cost. Just mention it in your order.', '2026-11-02 12:00:00', 0),
  (4, 1, 2, 3, 'Is the chicken kabsa very spicy?', '2026-11-02 15:00:00', 0, NULL, NULL, 1);
