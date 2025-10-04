//server.js
const express = require('express');
const session = require('express-session');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();

const saltRounds = 10;

// Middleware to parse form data and JSON
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Minimal session setup for quick development - must come BEFORE routes using req.session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
}));

// Serve static files from public folder
app.use(express.static('public'));

// MySQL connection setup (change as per your setup)
console.log('DB_HOST:', process.env.DB_HOST);
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});



db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Dynamic home page with session-based login state
app.get(['/', '/index.html'], (req, res) => {
  const user = req.session.user;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Trisha's Dairy - Fresh from Farm to Family</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Poppins:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --primary: #e8eaed;
      --secondary: #d1d5db;
      --accent1: #6b7280;
      --accent2: #4f46e5;
      --text: #374151;
      --shadow: rgba(107, 114, 128, 0.2);
    }
    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: var(--primary);
      color: var(--text);
      overflow-x: hidden;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background: var(--primary);
      box-shadow: 0 2px 8px var(--shadow);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .logo img {
      height: 60px;
    }
    nav ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      gap: 25px;
    }
    nav ul li a {
      text-decoration: none;
      font-weight: 600;
      color: var(--text);
      padding: 8px 16px;
      border-radius: 8px;
      transition: all 0.3s;
    }
    nav ul li a:hover {
      background: var(--accent1);
      color: var(--primary);
    }
    nav ul li a.active {
      background: var(--accent2);
      color: var(--primary);
    }
    .hero {
      position: relative;
      text-align: center;
      height: 640px;
      overflow: hidden;
    }
    .video-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
    }
    .video-bg::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(107, 114, 128, 0.25);
      z-index: 1;
    }
    .video-bg iframe {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 120vw;
      height: 700vh;
      min-width: 100%;
      min-height: 100%;
      transform: translate(-50%, -50%);
      object-fit: cover;
      pointer-events: none;
      border: none;
    }
    .quote {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 40px;
      font-weight: 700;
      font-family: 'Playfair Display', serif;
      color: var(--text);
      background: rgba(232, 234, 237, 0.92);
      padding: 28px 54px;
      border-radius: 20px;
      box-shadow: 0 8px 30px var(--shadow);
      border: 2px solid var(--accent1);
      display: inline-block;
      z-index: 3;
      animation: fadein 1.6s ease;
    }
    @keyframes fadein {
      from { opacity: 0; transform: translate(-50%, -80%); }
      to { opacity: 1; transform: translate(-50%, -50%); }
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <img src="logo.png" alt="Trisha's Dairy Logo" />
    </div>
    <nav>
      <ul>
        <li><a href="index.html" class="active">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
       ${
          user
            ? `<li><a href="/cart"><img src="cart.png" alt="Cart" style="height: 20px; vertical-align: middle;"> Cart</a></li><li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
            : `<li><a href="login.html">Login/Register</a></li>`
        }

      </ul>
    </nav>
  </header>

  <section class="hero">
    <div class="video-bg">
      <iframe
        src="https://www.youtube.com/embed/yYSkAbvqNB8?autoplay=1&mute=1&controls=0&loop=1&playlist=yYSkAbvqNB8&showinfo=0&modestbranding=1"
        frameborder="0"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
    </div>
    <div class="quote">
      "Fresh from the farm, pure for your family."
    </div>
  </section>
</body>
</html>
  `);
});

// Middleware to protect routes (check if logged in)
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    return res.redirect('/login.html');
  }
}

// Registration route with hashed password
app.post('/register', (req, res) => { 
  const { user_name, email, phone, city, password, confirm_password } = req.body;

  if (!user_name || !email || !phone || !city || !password || !confirm_password) {
    return res.status(400).send('All fields are required.');
  }
  if (password !== confirm_password) {
    return res.status(400).send('Passwords do not match.');
  }

  db.query('SELECT * FROM users WHERE user_name = ? OR email = ?', [user_name, email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }
    if (results.length > 0) {
      return res.status(400).send('Username or email already registered.');
    }
    bcrypt.hash(password, saltRounds, (hashErr, hashedPassword) => {
      if (hashErr) {
        console.error('Hashing error:', hashErr);
        return res.status(500).send('Error processing password');
      }
      db.query(
        'INSERT INTO users (user_name, email, phone, city, password) VALUES (?, ?, ?, ?, ?)',
        [user_name, email, phone, city, hashedPassword],
        (insertErr) => {
          if (insertErr) {
            console.error('Error inserting user:', insertErr);
            return res.status(500).send('Database error');
          }
          req.session.user = user_name;  // Log the user in by setting session
          res.redirect('/dashboard');    // Redirect to the dashboard immediately
        }
      );
    });
  });
});

// Login route with password verification
app.post('/login', (req, res) => {
  const { user_name, password } = req.body;
  if (!user_name || !password) {
    return res.status(400).send('Please enter both username and password');
  }
  db.query('SELECT * FROM users WHERE user_name = ?', [user_name], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    if (results.length === 0) {
      return res.status(401).send('Invalid username or password');
    }
    const user = results[0];
    bcrypt.compare(password, user.password, (compareErr, isMatch) => {
      if (compareErr) {
        console.error('Comparison error:', compareErr);
        return res.status(500).send('Authentication error');
      }
      if (isMatch) {
        req.session.user = user_name; 
        res.redirect('/dashboard');
      } else {
        res.status(401).send('Invalid username or password');
      }
    });
  });
});
//user dashboard route.

app.get('/dashboard', isAuthenticated, (req, res) => {
  const currentUser = req.session.user;
  db.query('SELECT * FROM users WHERE user_name = ?', [currentUser], (err, userResults) => {
    if (err) return res.status(500).send('Database error');
    if (userResults.length === 0) return res.status(404).send('User not found');
    const user = userResults[0];

    // Fetch orders for this user (replace 'orders' as per your DB schema)
    db.query('SELECT * FROM orders WHERE user_id = ?', [user.id], (err, orderResults) => {
      if (err) return res.status(500).send('Database error (orders)');

      // Dashboard stats
      const totalOrders = orderResults.length;
      const pendingOrders = orderResults.filter(o => o.status === 'Processing').length;
      const totalSpent = orderResults.reduce((sum, o) => sum + Number(o.total_amount), 0);
      const rating = user.rating || '5★'; // or any default

      // Orders HTML
      let ordersHtml = '';
      orderResults.forEach(order => {
        ordersHtml += `
          <div class="order-item">
            <div class="order-info">
              <h4>Order #${order.order_id}</h4>
              <p>${order.description || ''}</p>
              <p>Placed on ${order.order_date}</p>
            </div>
            <div class="order-status status-${order.status.toLowerCase()}">${order.status}</div>
          </div>
        `;
      });

      // Render dashboard HTML with dynamic data
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>User Dashboard - Trisha's Dairy</title>
  <style>
    :root {
      --primary: #e8eaed;
      --secondary: #d1d5db;
      --accent1: #6b7280;
      --accent2: #4f46e5;
      --text: #374151;
      --shadow: rgba(107, 114, 128, 0.2);
    }
    body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--primary); color: var(--text);}
    .top-bar { width: 100%; height: 70px; background: var(--accent2); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; box-shadow: 0 2px 6px var(--shadow);}
    .top-bar .logo img { height: 50px;}
    .top-bar .user-menu { display: flex; align-items: center; gap: 20px; color: var(--primary);}
    .top-bar .user-menu a { color: var(--primary); text-decoration: none; font-weight: 600; padding: 8px 16px; border-radius: 6px; transition: background 0.3s;}
    .top-bar .user-menu a:hover { background: rgba(255,255,255,0.2);}
    .container { display: flex; min-height: calc(100vh - 70px);}
    .sidebar { width: 280px; background: var(--secondary); padding: 30px 20px; box-shadow: 2px 0 5px var(--shadow);}
    .user-profile { text-align: center; margin-bottom: 40px; padding: 20px; background: var(--primary); border-radius: 12px;}
    .user-profile img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px; border: 3px solid var(--accent2);}
    .user-profile h3 { margin: 0 0 5px 0; color: var(--accent2); font-weight: 600;}
    .user-profile p { margin: 0; color: var(--accent1); font-size: 14px;}
    .sidebar-nav { list-style: none; padding: 0; margin: 0;}
    .sidebar-nav li { margin-bottom: 10px;}
    .sidebar-nav a { display: block; padding: 15px 20px; text-decoration: none; color: var(--text); border-radius: 8px; font-weight: 600; transition: all 0.3s;}
    .sidebar-nav a:hover, .sidebar-nav a.active { background: var(--accent2); color: var(--primary);}
    .main-content { flex: 1; padding: 40px;}
    .dashboard-header { margin-bottom: 40px;}
    .dashboard-header h1 { font-size: 2.2rem; color: var(--accent2); margin-bottom: 10px; font-weight: 700;}
    .dashboard-header p { color: var(--accent1); font-size: 1.1rem;}
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 25px; margin-bottom: 40px;}
    .stat-card { background: var(--secondary); padding: 30px 25px; border-radius: 12px; text-align: center; box-shadow: 0 4px 12px var(--shadow); transition: transform 0.3s;}
    .stat-card:hover { transform: translateY(-5px);}
    .stat-card h3 { font-size: 2rem; color: var(--accent2); margin: 0 0 10px 0; font-weight: 700;}
    .stat-card p { margin: 0; color: var(--accent1); font-weight: 600;}
    .recent-orders { background: var(--secondary); border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px var(--shadow);}
    .recent-orders h2 { color: var(--accent2); margin-bottom: 25px; font-weight: 700;}
    .order-item { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: var(--primary); border-radius: 8px; margin-bottom: 15px; transition: transform 0.2s;}
    .order-item:hover { transform: translateX(5px);}
    .order-item:last-child { margin-bottom: 0;}
    .order-info h4 { margin: 0 0 5px 0; color: var(--text); font-weight: 600;}
    .order-info p { margin: 0; color: var(--accent1); font-size: 14px;}
    .order-status { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;}
    .status-delivered { background: #22c55e; color: white;}
    .status-processing { background: #f59e0b; color: white;}
    .status-shipped { background: var(--accent2); color: white;}
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="logo">
      <img src="logo.png" alt="Trisha's Dairy Logo" />
    </div>
    <div class="user-menu">
      <span>Welcome, ${user.user_name}!</span>
      <a href="index.html">Home</a>
      <a href="/logout">Logout</a>
    </div>
  </div>
  <div class="container">
    <div class="sidebar">
      <div class="user-profile">
        <img src="profile.png" alt="User Profile" />
        <h3>${user.user_name}</h3>
        <p>${user.email}</p>
      </div>
      <ul class="sidebar-nav">
        <li><a href="#" class="active">Dashboard</a></li>
        <li><a href="#">My Orders</a></li>
        <li><a href="#">Order History</a></li>
        <li><a href="#">Profile Settings</a></li>
        <li><a href="#">Address Book</a></li>
        <li><a href="#">Payment Methods</a></li>
        <li><a href="#">Support</a></li>
      </ul>
    </div>
    <div class="main-content">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening with your account.</p>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>${totalOrders}</h3>
          <p>Total Orders</p>
        </div>
        <div class="stat-card">
          <h3>${pendingOrders}</h3>
          <p>Pending Orders</p>
        </div>
        <div class="stat-card">
          <h3>₹${totalSpent}</h3>
          <p>Total Spent</p>
        </div>
        <div class="stat-card">
          <h3>${rating}</h3>
          <p>Customer Rating</p>
        </div>
      </div>
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        ${ordersHtml}
      </div>
    </div>
  </div>
</body>
</html>
      `);
    });
  });
});


// Logout route to destroy session
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Could not log out. Please try again.');
    }
    res.redirect('/login.html');
  });
});

// Route to get all products as JSON - accessible by users
app.get('/api/products', (req, res) => {
  db.query('SELECT product_id, product_name, description, price, stock, image_url, category FROM products', (err, results) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Database error fetching products' });
    }
    res.json(results);
  });
});

// Session info API for frontend to check login status
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Contact form submission route 
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  console.log('Received:', name, email, phone, subject, message);
  if (!name || !email || !message) {
    console.log('Form validation error');
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  db.query(
    'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)',
    [name, email, phone, subject, message],
    (err) => {
      if (err) {
        console.error('Error saving contact:', err.code, err.sqlMessage, err);
        return res.status(500).json({ error: 'Database error.' });
      }
      res.json({ message: 'Thank you for contacting us! We will reach out soon.' });
    }
  );
});

// Dynamic Cart Route - Your Design with Session Data
app.get('/cart', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const currentUser = req.session.user;

  if (cart.length === 0) {
    // Empty cart HTML
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shopping Cart - Trisha's Dairy</title>
  <style>
    :root {
      --primary: #e8eaed;
      --secondary: #d1d5db;
      --accent1: #6b7280;
      --accent2: #4f46e5;
      --text: #374151;
      --shadow: rgba(107, 114, 128, 0.2);
    }
    body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--primary); color: var(--text); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 10px 40px; background: var(--primary); box-shadow: 0 2px 8px var(--shadow); position: sticky; top: 0; z-index: 1000; }
    .logo img { height: 60px; }
    nav ul { list-style: none; margin: 0; padding: 0; display: flex; gap: 25px; }
    nav ul li a { text-decoration: none; font-weight: 600; color: var(--text); padding: 8px 16px; border-radius: 8px; transition: all 0.3s; }
    nav ul li a:hover { background: var(--accent1); color: var(--primary); }
    nav ul li a.active { background: var(--accent2); color: var(--primary); }
    .empty-cart { text-align: center; padding: 60px; color: var(--accent1); }
    .empty-cart h2 { color: var(--accent2); margin-bottom: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <img src="logo.png" alt="Trisha's Dairy Logo" />
    </div>
    <nav>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="/cart" class="active">Cart</a></li>
        <li>Welcome, ${currentUser} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>
      </ul>
    </nav>
  </header>
  <div class="empty-cart">
    <h2>Your Cart is Empty</h2>
    <p>Add some delicious dairy products to get started!</p>
    <a href="/products.html">← Continue Shopping</a>
  </div>
</body>
</html>
    `);
  }

  // Fetch product details for cart items
  const productIds = cart.map(item => item.product_id);
  db.query('SELECT * FROM products WHERE product_id IN (?)', [productIds], (err, products) => {
    if (err) {
      return res.status(500).send('Database error loading cart.');
    }

    // Generate cart items HTML
    let cartItemsHtml = '';
    let subtotal = 0;

    cart.forEach(cartItem => {
      const product = products.find(p => p.product_id === cartItem.product_id);
      if (product) {
        const itemTotal = product.price * cartItem.qty;
        subtotal += itemTotal;
        
        cartItemsHtml += `
        <div class="cart-item">
          <img src="${product.image_url}" alt="${product.product_name}" />
          <div class="item-details">
            <h3>${product.product_name}</h3>
            <p>${product.description}</p>
          </div>
          <div class="quantity-controls">
            <form method="POST" action="/update-cart" style="display: inline;">
              <input type="hidden" name="product_id" value="${product.product_id}">
              <input type="hidden" name="action" value="decrease">
              <button type="submit" class="quantity-btn">-</button>
            </form>
            <span class="quantity">${cartItem.qty}</span>
            <form method="POST" action="/update-cart" style="display: inline;">
              <input type="hidden" name="product_id" value="${product.product_id}">
              <input type="hidden" name="action" value="increase">
              <button type="submit" class="quantity-btn">+</button>
            </form>
          </div>
          <div class="item-price">₹${itemTotal}</div>
          <form method="POST" action="/remove-from-cart" style="display: inline;">
            <input type="hidden" name="product_id" value="${product.product_id}">
            <button type="submit" class="remove-btn">Remove</button>
          </form>
        </div>
        `;
      }
    });

    const deliveryFee = 25;
    const discount = subtotal > 100 ? 10 : 0;
    const total = subtotal + deliveryFee - discount;

    // Send full cart page with your exact design
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shopping Cart - Trisha's Dairy</title>
  <style>
    :root {
      --primary: #e8eaed;
      --secondary: #d1d5db;
      --accent1: #6b7280;
      --accent2: #4f46e5;
      --text: #374151;
      --shadow: rgba(107, 114, 128, 0.2);
    }
    body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: var(--primary); color: var(--text); }
    header { display: flex; align-items: center; justify-content: space-between; padding: 10px 40px; background: var(--primary); box-shadow: 0 2px 8px var(--shadow); position: sticky; top: 0; z-index: 1000; }
    .logo img { height: 60px; }
    nav ul { list-style: none; margin: 0; padding: 0; display: flex; gap: 25px; }
    nav ul li a { text-decoration: none; font-weight: 600; color: var(--text); padding: 8px 16px; border-radius: 8px; transition: all 0.3s; }
    nav ul li a:hover { background: var(--accent1); color: var(--primary); }
    nav ul li a.active { background: var(--accent2); color: var(--primary); }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px; }
    .cart-header { text-align: center; margin-bottom: 40px; }
    .cart-header h1 { font-size: 2.5rem; color: var(--accent2); margin-bottom: 10px; font-weight: 700; }
    .cart-content { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
    .cart-items { background: var(--secondary); border-radius: 16px; padding: 30px; box-shadow: 0 8px 24px var(--shadow); }
    .cart-item { display: flex; align-items: center; padding: 20px; background: var(--primary); border-radius: 12px; margin-bottom: 20px; transition: transform 0.2s; }
    .cart-item:hover { transform: translateX(5px); }
    .cart-item img { width: 80px; height: 80px; border-radius: 8px; margin-right: 20px; }
    .item-details { flex: 1; }
    .item-details h3 { margin: 0 0 5px 0; color: var(--accent2); font-weight: 600; }
    .item-details p { margin: 0; color: var(--accent1); }
    .quantity-controls { display: flex; align-items: center; gap: 10px; margin: 0 20px; }
    .quantity-btn { width: 35px; height: 35px; border: none; background: var(--accent2); color: var(--primary); border-radius: 6px; cursor: pointer; font-weight: bold; }
    .quantity-btn:hover { background: #3b36d9; }
    .quantity { font-weight: 600; font-size: 18px; }
    .item-price { font-weight: 700; font-size: 18px; color: var(--accent2); margin: 0 20px; }
    .remove-btn { background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .remove-btn:hover { background: #dc2626; }
    .cart-summary { background: var(--secondary); border-radius: 16px; padding: 30px; box-shadow: 0 8px 24px var(--shadow); height: fit-content; }
    .cart-summary h2 { color: var(--accent2); margin-bottom: 25px; font-weight: 700; }
    .summary-line { display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px 0; }
    .summary-line.total { border-top: 2px solid var(--accent1); padding-top: 20px; font-weight: 700; font-size: 1.2rem; color: var(--accent2); }
    .checkout-btn { width: 100%; padding: 16px; background: var(--accent2); color: var(--primary); border: none; border-radius: 8px; font-size: 18px; font-weight: 700; cursor: pointer; margin-top: 20px; transition: all 0.3s; }
    .checkout-btn:hover { background: #3b36d9; transform: translateY(-2px); }
    .continue-shopping { text-align: center; margin-top: 20px; }
    .continue-shopping a { color: var(--accent2); text-decoration: none; font-weight: 600; }
    @media (max-width: 768px) { .cart-content { grid-template-columns: 1fr; } .cart-item { flex-direction: column; text-align: center; gap: 15px; } }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <img src="logo.png" alt="Trisha's Dairy Logo" />
    </div>
    <nav>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="/cart" class="active">Cart</a></li>
        <li>Welcome, ${currentUser} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>
      </ul>
    </nav>
  </header>

  <div class="container">
    <div class="cart-header">
      <h1>Your Shopping Cart</h1>
    </div>

    <div class="cart-content">
      <div class="cart-items">
        ${cartItemsHtml}
      </div>

      <div class="cart-summary">
        <h2>Order Summary</h2>
        <div class="summary-line">
          <span>Subtotal:</span>
          <span>₹${subtotal}</span>
        </div>
        <div class="summary-line">
          <span>Delivery Fee:</span>
          <span>₹${deliveryFee}</span>
        </div>
        <div class="summary-line">
          <span>Discount:</span>
          <span>-₹${discount}</span>
        </div>
        <div class="summary-line total">
          <span>Total:</span>
          <span>₹${total}</span>
        </div>
        <form action="/checkout" method="POST">
          <button type="submit" class="checkout-btn">Proceed to Checkout</button>
        </form>
        <div class="continue-shopping">
          <a href="products.html">← Continue Shopping</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `);
  });
});


// Add to cart route
app.post('/add-to-cart', isAuthenticated, (req, res) => {
  const { product_id, qty } = req.body;
  if (!req.session.cart) req.session.cart = [];
  const index = req.session.cart.findIndex(item => item.product_id == product_id);
  if (index !== -1) {
    req.session.cart[index].qty += parseInt(qty);
  } else {
    req.session.cart.push({
      product_id: parseInt(product_id),
      qty: parseInt(qty)
    });
  }
  res.send('Product has been added to cart! <a href="/cart">View Cart</a> | <a href="/products.html">Continue Shopping</a>');
});


// POST /update-cart
app.post('/update-cart', isAuthenticated, (req, res) => {
  const { product_id, action } = req.body;
  if (!req.session.cart) req.session.cart = [];
  const index = req.session.cart.findIndex(item => item.product_id == product_id);
  if (index !== -1) {
    if (action === 'increase') {
      req.session.cart[index].qty += 1;
    } else if (action === 'decrease') {
      // Only decrease if quantity > 1
      if (req.session.cart[index].qty > 1) {
        req.session.cart[index].qty -= 1;
      }
    }
  }
  res.redirect('/cart');
});


// POST /remove-from-cart
app.post('/remove-from-cart', isAuthenticated, (req, res) => {
  const { product_id } = req.body;
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(item => item.product_id != product_id);
  res.redirect('/cart');
});





// Start server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});