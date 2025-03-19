require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://localhost:3000' }));

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notes_app_db',
  password: process.env.DB_PASSWORD,
  port: 5432,
});

pool.connect((err) => {
  if (err) console.error('Database connection failed:', err.stack);
  else console.log('Connected to database successfully');
});

app.post('/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Registration validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  const { username, password } = req.body;
  console.log('Registration attempt:', { username });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ error: 'Username already exists or invalid input' });
  }
});

app.post('/login', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Login validation errors:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    console.log('User found:', user ? { id: user.id, username: user.username } : 'None');
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('Token generated for user:', user.id);
      res.status(200).json({ token });
    } else {
      console.log('Login failed: Invalid credentials');
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// HTTPS Server
const PORT = 3001;
https.createServer({
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
}, app).listen(PORT, () => {
  console.log(`User Service running on port ${PORT} with HTTPS`);
});