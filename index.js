const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname)));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL + "?sslmode=require",
});

// Enable JSON parsing for the preferences update
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);

// Create users table
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    preferences TEXT
  )
`);

app.get("/", (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, "dashboard.html"));
  } else {
    res.sendFile(path.join(__dirname, "login.html"));
  }
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    await pool.query("INSERT INTO users (username, email, password) VALUES ($1, $2, $3)", [
      username,
      email,
      hashedPassword,
    ]);
    res.redirect("/");
  } catch (err) {
    res.status(400).send("Username or email already exists");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    const user = result.rows[0];

    if (user && bcrypt.compareSync(password, user.password)) {
      req.session.user = username;
      res.redirect("/");
    } else {
      res.status(400).send("Invalid credentials");
    }
  } catch (err) {
    res.status(500).send("Server error");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.get("/db/users", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Unauthorized");
  }
  try {
    const result = await pool.query(
      "SELECT id, username, preferences FROM users",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/db/users/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("Unauthorized");
  }
  const { preferences } = req.body;
  try {
    await pool.query("UPDATE users SET preferences = $1 WHERE id = $2", [
      preferences,
      req.params.id,
    ]);
    res.send("Updated successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Bind the server to port 5000 on all interfaces
const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});