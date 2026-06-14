import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import axios from 'axios';

const db = new Database('content.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    id TEXT PRIMARY KEY,
    userId TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    published BOOLEAN DEFAULT 0,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Add userId column if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE content ADD COLUMN userId TEXT');
} catch (e) {
  // Column already exists
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get('/api/content', (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.json([]);
    }
    const rows = db.prepare('SELECT * FROM content WHERE userId = ? ORDER BY updatedAt DESC').all(userId);
    res.json(rows.map(row => ({
      ...row,
      data: JSON.parse(row.data as string),
      published: Boolean(row.published)
    })));
  });

  app.post('/api/content', (req, res) => {
    const { type, title, data, userId } = req.body;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO content (id, userId, type, title, data) VALUES (?, ?, ?, ?, ?)')
      .run(id, userId, type, title, JSON.stringify(data));
    res.json({ id });
  });

  app.put('/api/content/:id', (req, res) => {
    const { title, data, userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    db.prepare('UPDATE content SET title = ?, data = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?')
      .run(title, JSON.stringify(data), req.params.id, userId);
    res.json({ success: true });
  });

  app.delete('/api/content/:id', (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    db.prepare('DELETE FROM content WHERE id = ? AND userId = ?').run(req.params.id, userId);
    res.json({ success: true });
  });

  // Proxy for external images to avoid CORS issues
  app.get('/api/proxy-image', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).send('URL is required');
    }
    try {
      const response = await axios.get(url, { responseType: 'stream' });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      response.data.pipe(res);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).send('Error fetching image');
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
