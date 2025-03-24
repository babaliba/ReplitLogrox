
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('users.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Create users table
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  preferences TEXT
)`);

app.get('/', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  } else {
    res.sendFile(path.join(__dirname, 'login.html'));
  }
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
    [username, hashedPassword], 
    (err) => {
      if (err) {
        res.status(400).send('Username already exists');
      } else {
        res.redirect('/');
      }
    }
  );
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = username;
      res.redirect('/');
    } else {
      res.status(400).send('Invalid credentials');
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
