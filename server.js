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

//products route with dynamic product cards
app.get('/products.html', (req, res) => {
  const user = req.session.user;

  db.query('SELECT * FROM products', (err, products) => {
    if (err) return res.send('Error loading products.');

    // Build HTML cards for each product
    const productCards = products.map(product => `
      <div class="product-card">
        <img src="${product.image_url || 'default-product.png'}" alt="${product.product_name}" />
        <h3>${product.product_name}</h3>
        <p>${product.description}</p>
        <p>₹ ${product.price}</p>
        <p>In stock: ${product.stock}</p>
        <form method="POST" action="/add-to-cart" style="display:inline;">
          <input type="hidden" name="product_id" value="${product.product_id}" />
          <input type="hidden" name="qty" value="1" />
          <button class="cart-btn" type="submit">Add to Cart</button>
        </form>
        <button class="buy-btn" onclick="alert('Proceeding to order or checkout!')">Order</button>
      </div>
    `).join('');

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dairy Products - Products</title>
  <style>
    /* Your existing CSS */
    :root{
      --primary: #e8eaed;
      --secondary: #d1d5db;
      --accent1: #6b7280;
      --accent2: #4f46e5;
      --text: #374151;
      --shadow: rgba(107, 114, 128, 0.2);
    }
    *{box-sizing:border-box}
    body{
      margin:0;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%);
      color: var(--text);
    }
    header{display:flex;align-items:center;justify-content:space-between; padding:10px 40px;background:var(--primary); box-shadow:0 2px 8px var(--shadow); position:sticky;top:0;z-index:1000;}
    .logo img{height:60px}
    nav ul{list-style:none;margin:0;padding:0;display:flex;gap:25px}
    nav a{text-decoration:none;font-weight:600;color:var(--text);transition:all .3s; padding:8px 16px;border-radius:8px;}
    nav a:hover{background:var(--accent1); color:var(--primary);}
    nav a.active{background:var(--accent2); color:var(--primary); box-shadow:0 2px 6px var(--shadow);}
    .products{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:30px;padding:50px 40px;}
    .product-card{background:var(--primary);border-radius:16px;text-align:center; padding:30px 24px;box-shadow:0 8px 24px var(--shadow); transition:all .3s ease;border:1px solid var(--secondary);}
    .product-card:hover{transform:translateY(-8px); box-shadow:0 16px 40px rgba(79, 70, 229, 0.2); border-color:var(--accent1);}
    .product-card img{height:120px;margin-bottom:20px}
    .product-card h3{margin:0 0 8px 0;font-size:22px;color:var(--accent2);font-weight:700;}
    .product-card p{font-size:18px;margin:0 0 20px 0;font-weight:600;color:var(--accent1);}
    .cart-btn,.buy-btn{margin:6px;padding:12px 20px;border:none;border-radius:8px; font-size:16px;font-weight:600;cursor:pointer;transition:all .3s; min-width:100px;}
    .cart-btn{background:var(--secondary); color:var(--accent1); border:2px solid var(--accent1);}
    .cart-btn:hover{background:var(--accent1); color:var(--primary);}
    .buy-btn{background:var(--accent2); color:var(--primary);}
    .buy-btn:hover{background:#3b36d9; transform:translateY(-2px);}
  </style>
</head>
<body>
  <header>
    <div class="logo"><img src="logo.png" alt="Dairy Logo"></div>
    <nav>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html" class="active">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
        ${
          user
            ? `<li><a href="/cart"><img src="cart.png" style="height: 20px; vertical-align: middle;"> Cart</a></li>
                <li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
            : `<li><a href="login.html">Login/Register</a></li>`
        }
      </ul>
    </nav>
  </header>
  <section class="products">
    ${productCards}
  </section>
</body>
</html>
    `);
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
        <button type="button" class="checkout-btn" onclick="window.location.href='/checkout'">Proceed to Checkout</button>
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

// post add to cart route.
app.post('/add-to-cart', isAuthenticated, (req, res) => {
  const { product_id, qty } = req.body;
  db.query('SELECT * FROM products WHERE product_id = ?', [product_id], (err, results) => {
    if (err || results.length === 0) {
      return res.send('Product not found!');
    }
    const product = results[0];

    if (!req.session.cart) req.session.cart = [];

    const index = req.session.cart.findIndex(item => item.productid == productid);
    if (index !== -1) {
      req.session.cart[index].qty += parseInt(qty);
    } else {
      req.session.cart.push({
        product_id: product.product_id,
        product_name: product.product_name,    // ensure this line exists
        price: product.price,                // ensure this line exists
        qty: parseInt(qty)
      });
    }
    res.redirect('/cart');
  });
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

// search route with dynamic content

app.get('/search.html', (req, res) => {
  const user = req.session.user;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Search Products - Trisha's Dairy</title>
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--primary);
      color: var(--text);
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
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
    }
    .search-hero {
      text-align: center;
      margin-bottom: 40px;
    }
    .search-hero h1 {
      font-size: 2.5rem;
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 700;
    }
    .search-box {
      display: flex;
      max-width: 600px;
      margin: 0 auto 40px;
      box-shadow: 0 8px 24px var(--shadow);
      border-radius: 12px;
      overflow: hidden;
    }
    .search-box input {
      flex: 1;
      padding: 20px;
      border: none;
      outline: none;
      font-size: 16px;
      background: var(--secondary);
      color: var(--text);
    }
    .search-box button {
      padding: 20px 30px;
      background: var(--accent2);
      color: var(--primary);
      border: none;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .search-box button:hover {
      background: #3b36d9;
    }
    .filters {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 12px 24px;
      background: var(--secondary);
      color: var(--text);
      border: 2px solid var(--accent1);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .filter-btn:hover, .filter-btn.active {
      background: var(--accent2);
      color: var(--primary);
      border-color: var(--accent2);
    }
    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 30px;
    }
    .product-card {
      background: var(--secondary);
      border-radius: 16px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 8px 24px var(--shadow);
      transition: all 0.3s ease;
      border: 1px solid transparent;
    }
    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 16px 40px rgba(79, 70, 229, 0.2);
      border-color: var(--accent1);
    }
    .product-card img {
      width: 80px;
      height: 80px;
      margin-bottom: 16px;
      object-fit: contain;
    }
    .product-card h3 {
      font-size: 1.3rem;
      color: var(--accent2);
      margin-bottom: 8px;
      font-weight: 600;
    }
    .product-card p {
      color: var(--accent1);
      font-weight: 600;
      margin-bottom: 16px;
    }
    .product-card .btn {
      background: var(--accent2);
      color: var(--primary);
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }
    .product-card .btn:hover {
      background: #3b36d9;
      transform: translateY(-2px);
    }
    .no-results {
      text-align: center;
      padding: 60px;
      color: var(--accent1);
      font-size: 1.2rem;
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
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html" class="active">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
        ${
          user
            ? `<li><a href="/cart"><img src="cart.png" style="height: 20px; vertical-align: middle;"> Cart</a></li>
                <li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
            : `<li><a href="login.html">Login/Register</a></li>`
        }
      </ul>
    </nav>
  </header>
  <div class="container">
    <div class="search-hero">
      <h1>Find Your Dairy Products</h1>
      <div class="search-box">
        <input type="text" placeholder="Search for milk, cheese, yogurt..." />
        <button>Search</button>
      </div>
    </div>
    <div class="filters">
      <button class="filter-btn active">All Products</button>
      <button class="filter-btn">Milk</button>
      <button class="filter-btn">Cheese</button>
      <button class="filter-btn">Yogurt</button>
      <button class="filter-btn">Dairy Products</button>
      <button class="filter-btn">Fresh Items</button>
    </div>
    <div class="results-grid">
      <div class="product-card">
        <img src="milk.png" alt="Fresh Milk" />
        <h3>Fresh Milk</h3>
        <p>Creamy fresh milk from healthy cows</p>
        <p>₹ 20 / 500ml</p>
        <p>In stock: 100</p>
        <button class="btn">Add to Cart</button>
      </div>
      <div class="product-card">
        <img src="curd.png" alt="Curd" />
        <h3>Curd</h3>
        <p>Thick and creamy homemade curd</p>
        <p>₹ 34 / 500ml</p>
        <p>In stock: 50</p>
        <button class="btn">Add to Cart</button>
      </div>
      <div class="product-card">
        <img src="cheese.png" alt="Cheese" />
        <h3>Cheese</h3>
        <p>Rich and smooth cheese block</p>
        <p>₹ 60 / pack</p>
        <p>In stock: 30</p>
        <button class="btn">Add to Cart</button>
      </div>
      <div class="product-card">
        <img src="yogurt.png" alt="Yogurt" />
        <h3>Yogurt</h3>
        <p>Delicious natural yogurt</p>
        <p>₹ 40 / 500ml</p>
        <p>In stock: 40</p>
        <button class="btn">Add to Cart</button>
      </div>
      <div class="product-card">
        <img src="paneer.png" alt="Paneer" />
        <h3>Paneer</h3>
        <p>Fresh cottage cheese</p>
        <p>₹ 80 / pack</p>
        <p>In stock: 25</p>
        <button class="btn">Add to Cart</button>
      </div>
      <div class="product-card">
        <img src="ghee.png" alt="Ghee" />
        <h3>Ghee</h3>
        <p>Pure clarified butter</p>
        <p>₹ 100 / bottle</p>
        <p>In stock: 20</p>
        <button class="btn">Add to Cart</button>
      </div>
    </div>
  </div>
  <script>
    // Simple search and filter functionality
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    // Filter functionality
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.textContent.toLowerCase();
        productCards.forEach(card => {
          const productName = card.querySelector('h3').textContent.toLowerCase();
          if (filter === 'all products' || productName.includes(filter)) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Search functionality
    function performSearch() {
      const searchTerm = searchInput.value.toLowerCase();
      productCards.forEach(card => {
        const productName = card.querySelector('h3').textContent.toLowerCase();
        if (productName.includes(searchTerm)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  </script>
</body>
</html>
  `);
});

// about route with dynamic content.
app.get('/about.html', (req, res) => {
  const user = req.session.user;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>About Us - Trisha's Dairy</title>
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--primary);
      color: var(--text);
      line-height: 1.6;
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

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 40px;
    }

    .hero-section {
      text-align: center;
      margin-bottom: 60px;
    }

    .hero-section h1 {
      font-size: 3rem;
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 700;
    }

    .hero-section p {
      font-size: 1.2rem;
      color: var(--accent1);
      max-width: 600px;
      margin: 0 auto;
    }

    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 40px;
      margin-top: 40px;
    }

    .content-card {
      background: var(--secondary);
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 8px 24px var(--shadow);
      transition: transform 0.3s ease;
    }

    .content-card:hover {
      transform: translateY(-5px);
    }

    .content-card h3 {
      font-size: 1.8rem;
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 600;
    }

    .content-card p {
      font-size: 1.1rem;
      line-height: 1.7;
      color: var(--text);
    }

    .highlight {
      background: var(--accent2);
      color: var(--primary);
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin: 60px 0;
    }

    .highlight h2 {
      font-size: 2.5rem;
      margin-bottom: 20px;
      font-weight: 700;
    }

    .highlight p {
      font-size: 1.3rem;
      opacity: 0.9;
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
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html" class="active">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html">Contact</a></li>
        ${
          user
            ? `<li><a href="/cart"><img src="cart.png" style="height: 20px; vertical-align: middle;"> Cart</a></li>
                <li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
            : `<li><a href="login.html">Login/Register</a></li>`
        }
      </ul>
    </nav>
  </header>
  <div class="container">
    <div class="hero-section">
      <h1>About Trisha's Dairy</h1>
      <p>Your trusted partner for fresh, hygienic, and high-quality dairy products</p>
    </div>

    <div class="content-grid">
      <div class="content-card">
        <h3>Our Story</h3>
        <p>Trisha's Dairy is a corporate citizen who understands the enormous significance of hygienic milk and dairy products for agro and industrial development. Leveraging the strength of superior product offerings, Trisha's Dairy has strategized its foray into the consumer market, with the aim of being the market leader, earning respect and revenue for the stakeholders.</p>
      </div>

      <div class="content-card">
        <h3>Our Mission</h3>
        <p>Our mission is to become the premier retailer of high-quality food products in India. To achieve this goal, we are committed to passionately focusing on customer value, being intolerant of waste, and serving as responsible citizens in our communities.</p>
      </div>

      <div class="content-card">
        <h3>Our Promise</h3>
        <p>Our aim is to meet the diverse needs of consumers every day by marketing and selling foods that are consistent and of high quality. We ensure that every product that reaches your table meets the highest standards of freshness and purity.</p>
      </div>

      <div class="content-card">
        <h3>Quality Assurance</h3>
        <p>We maintain strict quality control measures throughout our supply chain, from farm to your family. Our state-of-the-art processing facilities and rigorous testing ensure that you receive only the best dairy products.</p>
      </div>
    </div>

    <div class="highlight">
      <h2>Fresh from Farm to Family</h2>
      <p>Experience the pure taste of nature with Trisha's Dairy products</p>
    </div>
  </div>
</body>
</html>
  `);
});


// contact route with dynamic content.

app.get('/contact.html', (req, res) => {
  const user = req.session.user;

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contact Us - Trisha's Dairy</title>
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--primary);
      color: var(--text);
      line-height: 1.6;
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
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 60px 40px;
    }
    .contact-header {
      text-align: center;
      margin-bottom: 60px;
    }
    .contact-header h1 {
      font-size: 3rem;
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 700;
    }
    .contact-header p {
      font-size: 1.2rem;
      color: var(--accent1);
      max-width: 600px;
      margin: 0 auto;
    }
    .contact-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      margin-bottom: 60px;
    }
    .contact-form {
      background: var(--secondary);
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px var(--shadow);
    }
    .contact-form h2 {
      color: var(--accent2);
      margin-bottom: 30px;
      font-weight: 600;
      font-size: 1.8rem;
    }
    .form-field {
      margin-bottom: 25px;
    }
    .form-field label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--text);
    }
    .form-field input, .form-field select, .form-field textarea {
      width: 100%;
      padding: 14px;
      border: 2px solid var(--accent1);
      border-radius: 8px;
      background: var(--primary);
      color: var(--text);
      font-size: 16px;
      transition: border-color 0.3s;
      font-family: inherit;
    }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none;
      border-color: var(--accent2);
    }
    .form-field textarea {
      resize: vertical;
      min-height: 120px;
    }
    .submit-btn {
      width: 100%;
      padding: 16px;
      background: var(--accent2);
      color: var(--primary);
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
    }
    .submit-btn:hover {
      background: #3b36d9;
      transform: translateY(-2px);
    }
    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    .info-card {
      background: var(--secondary);
      padding: 30px;
      border-radius: 16px;
      box-shadow: 0 8px 24px var(--shadow);
      transition: transform 0.3s;
    }
    .info-card:hover {
      transform: translateY(-5px);
    }
    .info-card .icon {
      width: 60px;
      height: 60px;
      background: var(--accent2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      font-size: 1.5rem;
      color: var(--primary);
    }
    .info-card h3 {
      color: var(--accent2);
      margin-bottom: 15px;
      font-weight: 600;
      font-size: 1.3rem;
    }
    .info-card p {
      margin: 5px 0;
      color: var(--text);
    }
    .map-section {
      background: var(--secondary);
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px var(--shadow);
      text-align: center;
    }
    .map-section h2 {
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 700;
      font-size: 1.8rem;
    }
    .map-placeholder {
      width: 100%;
      height: 300px;
      background: var(--accent1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary);
      font-size: 1.2rem;
      font-weight: 600;
    }
    @media (max-width: 768px) {
      .contact-content {
        grid-template-columns: 1fr;
        gap: 40px;
      }
      .container {
        padding: 40px 20px;
      }
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
        <li><a href="index.html">Home</a></li>
        <li><a href="products.html">Products</a></li>
        <li><a href="about.html">About Us</a></li>
        <li><a href="search.html">Search</a></li>
        <li><a href="contact.html" class="active">Contact</a></li>
        ${
          user
            ? `<li><a href="/cart"><img src="cart.png" style="height: 20px; vertical-align: middle;"> Cart</a></li>
                <li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
            : `<li><a href="login.html">Login/Register</a></li>`
        }
      </ul>
    </nav>
  </header>
  <div class="container">
    <div class="contact-header">
      <h1>Get in Touch</h1>
      <p>We'd love to hear from you! Reach out to us for any questions about our fresh dairy products or services.</p>
    </div>

    <div class="contact-content">
      <div class="contact-form">
        <h2>📧 Send us a Message</h2>
        <form>
          <div class="form-field">
            <label for="name">Full Name</label>
            <input type="text" id="name" required />
          </div>

          <div class="form-field">
            <label for="email">Email Address</label>
            <input type="email" id="email" required />
          </div>

          <div class="form-field">
            <label for="phone">Phone Number</label>
            <input type="tel" id="phone" />
          </div>

          <div class="form-field">
            <label for="subject">Subject</label>
            <select id="subject" required>
              <option value="">Select a topic</option>
              <option value="general">General Inquiry</option>
              <option value="order">Order Support</option>
              <option value="quality">Product Quality</option>
              <option value="delivery">Delivery Issues</option>
              <option value="partnership">Business Partnership</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          <div class="form-field">
            <label for="message">Message</label>
            <textarea id="message" placeholder="Tell us how we can help you..." required></textarea>
          </div>

          <button type="submit" class="submit-btn">Send Message</button>
        </form>
      </div>

      <div class="contact-info">
        <div class="info-card">
          <div class="icon">📍</div>
          <h3>Visit Our Store</h3>
          <p>123 Dairy Lane</p>
          <p>Fresh Valley, MH 400001</p>
          <p>Bangaluru, India</p>
        </div>

        <div class="info-card">
          <div class="icon">📞</div>
          <h3>Call Us</h3>
          <p>Customer Service: +91 98765 43210</p>
          <p>Order Support: +91 98765 43211</p>
          <p>Mon-Sat: 7:00 AM - 9:00 PM</p>
        </div>

        <div class="info-card">
          <div class="icon">✉️</div>
          <h3>Email Us</h3>
          <p>orders@trishasdairy.com</p>
          <p>support@trishasdairy.com</p>
          <p>info@trishasdairy.com</p>
        </div>

        <div class="info-card">
          <div class="icon">⏰</div>
          <h3>Business Hours</h3>
          <p>Monday - Saturday: 6:00 AM - 10:00 PM</p>
          <p>Sunday: 7:00 AM - 8:00 PM</p>
          <p>Delivery: Daily 6:00 AM - 6:00 PM</p>
        </div>
      </div>
    </div>

    <div class="map-section">
      <h2>📍 Find Us</h2>
      <div class="map-placeholder">
        🗺️ Interactive Map Coming Soon
      </div>
    </div>
  </div>

  <script>
  document.querySelector('.contact-form form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message })
      });
      const result = await response.json();
      if (response.ok) {
        alert(result.message);
        this.reset();
      } else {
        alert(result.error || 'Failed to submit the form.');
      }
    } catch (error) {
      alert('Error submitting form. Please try again.');
      console.error(error);
    }
  });
</script>
</body>
</html>
  `);
});

//get checkout route with dynamic content.
app.get('/checkout', (req, res) => {
  const user = req.session.user;
  const cart = req.session.cart || [];

  // Build the order summary HTML
  let orderSummaryHtml = '';
  if (cart.length === 0) {
    orderSummaryHtml = '<p>Your cart is empty.</p>';
  } else {
    cart.forEach(item => {
      orderSummaryHtml += `
        <div class="order-item">
          <div class="item-info">
            <h4>${item.product_name} x ${item.qty}</h4>
            <p>Price: ₹${item.price} | Subtotal: ₹${item.price * item.qty}</p>
          </div>
        </div>
      `;
    });
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Checkout - Trisha's Dairy</title>
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
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--primary);
      color: var(--text);
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 40px;
      background: var(--primary);
      box-shadow: 0 2px 8px var(--shadow);
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

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
    }

    .checkout-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .checkout-header h1 {
      font-size: 2.5rem;
      color: var(--accent2);
      margin-bottom: 10px;
      font-weight: 700;
    }

    .checkout-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 40px;
    }

    .checkout-form {
      background: var(--secondary);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 8px 24px var(--shadow);
    }

    .form-section {
      margin-bottom: 40px;
    }

    .form-section h2 {
      color: var(--accent2);
      margin-bottom: 20px;
      font-weight: 600;
      font-size: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-field {
      margin-bottom: 20px;
    }

    .form-field.full-width {
      grid-column: 1 / -1;
    }

    .form-field label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--text);
    }

    .form-field input, .form-field select, .form-field textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid var(--accent1);
      border-radius: 8px;
      background: var(--primary);
      color: var(--text);
      font-size: 16px;
      transition: border-color 0.3s;
    }

    .form-field input:focus, .form-field select:focus, .form-field textarea:focus {
      outline: none;
      border-color: var(--accent2);
    }

    .payment-methods {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 15px;
    }

    .payment-option {
      padding: 15px;
      border: 2px solid var(--accent1);
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: var(--primary);
    }

    .payment-option:hover, .payment-option.selected {
      border-color: var(--accent2);
      background: var(--accent2);
      color: var(--primary);
    }

    .order-summary {
      background: var(--secondary);
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 8px 24px var(--shadow);
      height: fit-content;
    }

    .order-summary h2 {
      color: var(--accent2);
      margin-bottom: 25px;
      font-weight: 700;
    }

    .order-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid var(--accent1);
    }

    .order-item:last-child {
      border-bottom: none;
    }

    .item-info h4 {
      margin: 0 0 5px 0;
      color: var(--text);
    }

    .item-info p {
      margin: 0;
      color: var(--accent1);
      font-size: 14px;
    }

    .summary-totals {
      margin-top: 25px;
      padding-top: 25px;
      border-top: 2px solid var(--accent1);
    }

    .summary-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .summary-line.total {
      font-weight: 700;
      font-size: 1.2rem;
      color: var(--accent2);
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid var(--accent1);
    }

    .place-order-btn {
      width: 100%;
      padding: 18px;
      background: var(--accent2);
      color: var(--primary);
      border: none;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 25px;
      transition: all 0.3s;
    }

    .place-order-btn:hover {
      background: #3b36d9;
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .checkout-content {
        grid-template-columns: 1fr;
      }
      
      .form-grid {
        grid-template-columns: 1fr;
      }
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
            <li><a href="index.html">Home</a></li>
            <li><a href="products.html">Products</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="search.html">Search</a></li>
            <li><a href="contact.html">Contact</a></li>
            ${
              user
                ? `<li><a href="/cart"><img src="cart.png" style="height: 20px; vertical-align: middle;"> Cart</a></li>
                  <li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
                : `<li><a href="login.html">Login/Register</a></li>`
            }
          </ul>
        </nav>
      </header>
      <div class="container">
        <div class="checkout-header">
          <h1>Checkout</h1>
        </div>
        <div class="checkout-content">
          <div class="checkout-form">
            <form method="POST" action="/checkout">
              <div class="form-section">
                <h2>🚚 Delivery Information</h2>
                <div class="form-grid">
                  <div class="form-field">
                    <label for="firstName">First Name</label>
                    <input type="text" name="firstName" id="firstName" required />
                  </div>
                  <div class="form-field">
                    <label for="lastName">Last Name</label>
                    <input type="text" name="lastName" id="lastName" required />
                  </div>
                  <div class="form-field full-width">
                    <label for="address">Street Address</label>
                    <input type="text" name="address" id="address" required />
                  </div>
                  <div class="form-field">
                    <label for="city">City</label>
                    <input type="text" name="city" id="city" required />
                  </div>
                  <div class="form-field">
                    <label for="pincode">Pin Code</label>
                    <input type="text" name="pincode" id="pincode" required />
                  </div>
                  <div class="form-field full-width">
                    <label for="phone">Phone Number</label>
                    <input type="tel" name="phone" id="phone" required />
                  </div>
                </div>
              </div>
              <div class="form-section">
                <h2>💳 Payment Method</h2>
                <div class="payment-methods">
                  <div class="payment-option selected">
                    <strong>💰</strong><br>Cash on Delivery (COD)
                  </div>
                </div>
                <input type="hidden" name="payment_method" value="COD" />
              </div>
              <div class="form-section">
                <h2>📝 Special Instructions</h2>
                <div class="form-field">
                  <textarea name="instructions" rows="3" placeholder="Any special delivery instructions..."></textarea>
                </div>
              </div>
              <button type="submit" class="place-order-btn">Place Order</button>
            </form>
          </div>
          <div class="order-summary">
            <h2>Order Summary</h2>
            ${orderSummaryHtml}
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});


// POST: Place new order, store for admin and user
app.post('/checkout', (req, res) => {
  const user = req.session.user;
  const { firstName, lastName, address, city, pincode, phone, payment_method, instructions } = req.body;
  const cart = req.session.cart || [];

  db.query(
    `INSERT INTO orders (user_id, delivery_name, delivery_address, city, pincode, phone, instructions, payment_method, order_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
    [user, `${firstName} ${lastName}`, address, city, pincode, phone, instructions, payment_method, 'Processing'],
    (err, result) => {
      if (err) {
        console.error('Error placing order:', err);
        return res.send('Error placing order.<br>' + err.message);
      }

      // --- NEW CODE: Insert each product from cart into order_items ---
      const orderId = result.insertId; // Gets the order's ID
      cart.forEach(item => {
        db.query(
          "INSERT INTO order_items (order_id, product_id, qty, price) VALUES (?, ?, ?, ?)",
          [orderId, item.product_id, item.qty, item.price]
        );
      });

      req.session.cart = []; // Clear the cart

      res.redirect('/dashboard'); // Success, go to dashboard
    }
  );
});




// Start server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});