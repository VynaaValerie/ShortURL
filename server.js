const express = require('express');
const path = require('path');
const fs = require('fs');
const { nanoid } = require('nanoid');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const dbPath = process.env.DATABASE_URL || './urls.db';

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS urls (
      id TEXT PRIMARY KEY,
      original_url TEXT NOT NULL,
      short_code TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      clicks INTEGER DEFAULT 0
    )`);
  }
});

// Enhanced security middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// API: Create short URL
app.post('/api/shorten', async (req, res) => {
  try {
    const { url, customName } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid URL format'
      });
    }

    let shortCode = customName || nanoid(6);
    
    // Check if custom name is available
    if (customName) {
      const existing = await new Promise((resolve) => {
        db.get('SELECT short_code FROM urls WHERE short_code = ?', [shortCode], (err, row) => {
          resolve(row);
        });
      });
      
      if (existing) {
        return res.status(400).json({ 
          success: false,
          error: 'Custom name is already taken'
        });
      }
    }

    const id = nanoid(12);
    const createdAt = new Date().toISOString();

    await new Promise((resolve) => {
      db.run(
        'INSERT INTO urls (id, original_url, short_code, created_at) VALUES (?, ?, ?, ?)',
        [id, url, shortCode, createdAt],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ 
              success: false,
              error: 'Failed to create short URL'
            });
          }
          resolve();
        }
      );
    });

    res.json({
      success: true,
      data: {
        id,
        originalUrl: url,
        shortUrl: `${req.headers.host}/${shortCode}`,
        shortCode,
        createdAt
      }
    });
  } catch (error) {
    console.error('Shorten Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});

// API: Get URL info
app.get('/api/info/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const urlInfo = await new Promise((resolve) => {
      db.get('SELECT * FROM urls WHERE short_code = ?', [code], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ 
            success: false,
            error: 'Failed to fetch URL info'
          });
        }
        resolve(row);
      });
    });

    if (!urlInfo) {
      return res.status(404).json({ 
        success: false,
        error: 'Short URL not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: urlInfo.id,
        originalUrl: urlInfo.original_url,
        shortUrl: `${req.headers.host}/${urlInfo.short_code}`,
        shortCode: urlInfo.short_code,
        createdAt: urlInfo.created_at,
        clicks: urlInfo.clicks
      }
    });
  } catch (error) {
    console.error('Info Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});

// Redirect short URL
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const urlInfo = await new Promise((resolve) => {
      db.get('SELECT original_url FROM urls WHERE short_code = ?', [code], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).send('Internal server error');
        }
        resolve(row);
      });
    });

    if (!urlInfo) {
      return res.status(404).send('URL not found');
    }

    // Update click count
    db.run('UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?', [code]);

    res.redirect(301, urlInfo.original_url);
  } catch (error) {
    console.error('Redirect Error:', error);
    res.status(500).send('Internal server error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Handle all other routes - serve static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});