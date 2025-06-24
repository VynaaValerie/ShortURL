const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { isWebUri } = require('valid-url');
const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./urls.db', (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to the SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_url TEXT NOT NULL,
        short_code TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Generate random short code
function generateShortCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// API Endpoint to shorten URL
app.post('/api/shorten', async (req, res) => {
  try {
    const { originalUrl } = req.body;
    
    if (!originalUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    if (!isWebUri(originalUrl)) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Check if URL already exists in database
    db.get('SELECT short_code FROM urls WHERE original_url = ?', [originalUrl], (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        // URL already exists, return existing short code
        const shortUrl = `${req.protocol}://${req.get('host')}/${row.short_code}`;
        return res.json({
          originalUrl,
          shortUrl
        });
      } else {
        // Generate new short code
        const shortCode = generateShortCode();
        
        // Insert into database
        db.run('INSERT INTO urls (original_url, short_code) VALUES (?, ?)', 
          [originalUrl, shortCode], 
          function(err) {
            if (err) {
              console.error('Database insert error:', err);
              return res.status(500).json({ error: 'Failed to create short URL' });
            }
            
            const shortUrl = `${req.protocol}://${req.get('host')}/${shortCode}`;
            res.json({
              originalUrl,
              shortUrl
            });
          }
        );
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to shorten URL' });
  }
});

// Redirect endpoint for short URLs
app.get('/:shortCode', (req, res) => {
  const { shortCode } = req.params;
  
  db.get('SELECT original_url FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal server error');
    }
    
    if (row) {
      // Redirect to original URL
      res.redirect(301, row.original_url);
    } else {
      // Short code not found
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});