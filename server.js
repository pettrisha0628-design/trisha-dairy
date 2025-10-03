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
            ? `<li>Welcome, ${user} | <a href="/dashboard">Profile</a> | <a href="/logout">Logout</a></li>`
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

// Dashboard route - serves full styled dashboard with dynamic user info
app.get('/dashboard', isAuthenticated, (req, res) => {
  const currentUser = req.session.user;
  db.query('SELECT * FROM users WHERE user_name = ?', [currentUser], (err, results) => {
    if (err) return res.status(500).send('Database error');
    if (results.length === 0) return res.status(404).send('User not found');
    const user = results[0];

    // Note: images like logo.png and profile.png must be in the public folder

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
    body {
      margin: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: var(--primary);
      color: var(--text);
    }
    .top-bar {
      width: 100%;
      height: 70px;
      background: var(--accent2);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      box-shadow: 0 2px 6px var(--shadow);
    }
    .top-bar .logo img {
      height: 50px;
    }
    .top-bar .user-menu {
      display: flex;
      align-items: center;
      gap: 20px;
      color: var(--primary);
    }
    .top-bar .user-menu a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
      transition: background 0.3s;
    }
    .top-bar .user-menu a:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .container {
      display: flex;
      min-height: calc(100vh - 70px);
    }
    .sidebar {
      width: 280px;
      background: var(--secondary);
      padding: 30px 20px;
      box-shadow: 2px 0 5px var(--shadow);
    }
    .user-profile {
      text-align: center;
      margin-bottom: 40px;
      padding: 20px;
      background: var(--primary);
      border-radius: 12px;
    }
    .user-profile img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      margin-bottom: 15px;
      border: 3px solid var(--accent2);
    }
    .user-profile h3 {
      margin: 0 0 5px 0;
      color: var(--accent2);
      font-weight: 600;
    }
    .user-profile p {
      margin: 0;
      color: var(--accent1);
      font-size: 14px;
    }
    .sidebar-nav {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .sidebar-nav li {
      margin-bottom: 10px;
    }
    .sidebar-nav a {
      display: block;
      padding: 15px 20px;
      text-decoration: none;
      color: var(--text);
      border-radius: 8px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .sidebar-nav a:hover, .sidebar-nav a.active {
      background: var(--accent2);
      color: var(--primary);
    }
    .main-content {
      flex: 1;
      padding: 40px;
    }
    .dashboard-header {
      margin-bottom: 40px;
    }
    .dashboard-header h1 {
      font-size: 2.2rem;
      color: var(--accent2);
      margin-bottom: 10px;
      font-weight: 700;
    }
    .dashboard-header p {
      color: var(--accent1);
      font-size: 1.1rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 25px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: var(--secondary);
      padding: 30px 25px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 12px var(--shadow);
      transition: transform 0.3s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
    }
    .stat-card h3 {
      font-size: 2rem;
      color: var(--accent2);
      margin: 0 0 10px 0;
      font-weight: 700;
    }
    .stat-card p {
      margin: 0;
      color: var(--accent1);
      font-weight: 600;
    }
    .recent-orders {
      background: var(--secondary);
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 12px var(--shadow);
    }
    .recent-orders h2 {
      color: var(--accent2);
      margin-bottom: 25px;
      font-weight: 700;
    }
    .order-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      background: var(--primary);
      border-radius: 8px;
      margin-bottom: 15px;
      transition: transform 0.2s;
    }
    .order-item:hover {
      transform: translateX(5px);
    }
    .order-item:last-child {
      margin-bottom: 0;
    }
    .order-info h4 {
      margin: 0 0 5px 0;
      color: var(--text);
      font-weight: 600;
    }
    .order-info p {
      margin: 0;
      color: var(--accent1);
      font-size: 14px;
    }
    .order-status {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-delivered {
      background: #22c55e;
      color: white;
    }
    .status-processing {
      background: #f59e0b;
      color: white;
    }
    .status-shipped {
      background: var(--accent2);
      color: white;
    }
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
          <h3>12</h3>
          <p>Total Orders</p>
        </div>
        <div class="stat-card">
          <h3>3</h3>
          <p>Pending Orders</p>
        </div>
        <div class="stat-card">
          <h3>₹2,450</h3>
          <p>Total Spent</p>
        </div>
        <div class="stat-card">
          <h3>5★</h3>
          <p>Customer Rating</p>
        </div>
      </div>
      <div class="recent-orders">
        <h2>Recent Orders</h2>
        <div class="order-item">
          <div class="order-info">
            <h4>Order #1234</h4>
            <p>2 x Fresh Milk, 1 x Curd</p>
            <p>Placed on Aug 20, 2025</p>
          </div>
          <div class="order-status status-delivered">Delivered</div>
        </div>
        <div class="order-item">
          <div class="order-info">
            <h4>Order #1235</h4>
            <p>1 x Paneer, 1 x Ghee</p>
            <p>Placed on Aug 21, 2025</p>
          </div>
          <div class="order-status status-processing">Processing</div>
        </div>
        <div class="order-item">
          <div class="order-info">
            <h4>Order #1236</h4>
            <p>3 x Yogurt, 2 x Cheese</p>
            <p>Placed on Aug 21, 2025</p>
          </div>
          <div class="order-status status-shipped">Shipped</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
    `);
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


// Start server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});