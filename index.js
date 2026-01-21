const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static images
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Load product data
const bottoms = require('./data/bottoms.json');
const hoodies = require('./data/hoodies.json');
const zipups = require('./data/zipups.json');
const tshirts = require('./data/tshirts.json');

// API Routes

// Get all products
app.get('/api/products', (req, res) => {
  res.json({
    zipups,
    hoodies,
    tshirts,
    bottoms
  });
});

// Get bottoms
app.get('/api/products/bottoms', (req, res) => {
  res.json(bottoms);
});

// Get specific product by style code
app.get('/api/products/bottoms/:style', (req, res) => {
  const { style } = req.params;
  const product = bottoms.products.find(p =>
    p.style.toUpperCase() === style.toUpperCase()
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Get hoodies
app.get('/api/products/hoodies', (req, res) => {
  res.json(hoodies);
});

// Get specific hoodie by style code
app.get('/api/products/hoodies/:style', (req, res) => {
  const { style } = req.params;
  const product = hoodies.products.find(p =>
    p.style.toUpperCase() === style.toUpperCase()
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Get zipups
app.get('/api/products/zipups', (req, res) => {
  res.json(zipups);
});

// Get specific zipup by style code
app.get('/api/products/zipups/:style', (req, res) => {
  const { style } = req.params;
  const product = zipups.products.find(p =>
    p.style.toUpperCase() === style.toUpperCase()
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Get tshirts
app.get('/api/products/tshirts', (req, res) => {
  res.json(tshirts);
});

// Get specific tshirt by style code
app.get('/api/products/tshirts/:style', (req, res) => {
  const { style } = req.params;
  const product = tshirts.products.find(p =>
    p.style.toUpperCase() === style.toUpperCase()
  );

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Blanks Server running on http://localhost:${PORT}`);
  console.log(`Images available at http://localhost:${PORT}/images/`);
});
