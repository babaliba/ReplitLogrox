require('dotenv').config();

const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname)));

const ACCESS_CODE = process.env.ACCESS_CODE || "123456";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
    return res.sendFile(path.join(__dirname, "dashboard.html"));
  }
  res.sendFile(path.join(__dirname, "welcome.html"));
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/survey", (req, res) => {
  if (!req.session.prelogin) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/verify-code", (req, res) => {
  const { code } = req.body;
  if (code === ACCESS_CODE) {
    req.session.prelogin = true;
    res.redirect("/survey");
  } else {
    res.status(401).send("Código incorrecto");
  }
});

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    
    if (result.rows.length > 0) {
      return res.status(400).send("El usuario o email ya existe");
    }

    await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error en el registro");
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
    return res.status(401).send("No autorizado");
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
    return res.status(401).send("No autorizado");
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

app.get("/public/empleados", async (req, res) => {
  if (!req.session.prelogin) {
    return res.status(401).send("No autorizado");
  }
  try {
    const result = await pool.query(
      "SELECT id, nombre, apellidos FROM empleados ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Rutas para empleados
app.get("/api/empleados", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("No autorizado");
  }
  try {
    const result = await pool.query("SELECT * FROM empleados ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/api/empleados", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("No autorizado");
  }
  const { nombre, apellidos, alias, email, telefono, departamento, rol, activo } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO empleados (nombre, apellidos, alias, email, telefono, departamento, rol, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [nombre, apellidos, alias, email, telefono, departamento, rol, activo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/api/empleados/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("No autorizado");
  }
  const { nombre, apellidos, alias, email, telefono, departamento, rol, activo } = req.body;
  try {
    const result = await pool.query(
      "UPDATE empleados SET nombre=$1, apellidos=$2, alias=$3, email=$4, telefono=$5, departamento=$6, rol=$7, activo=$8 WHERE id=$9 RETURNING *",
      [nombre, apellidos, alias, email, telefono, departamento, rol, activo, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete("/api/empleados/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("No autorizado");
  }
  try {
    await pool.query("DELETE FROM empleados WHERE id=$1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Bind the server to port 5000 on all interfaces
const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
