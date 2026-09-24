import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DIST_DIR = join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  // Normalize path and remove query string/hash
  const urlPath = req.url.split('?')[0].split('#')[0];
  let filePath = join(DIST_DIR, urlPath);

  // If path is a directory, serve index.html
  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) {
      filePath = join(DIST_DIR, 'index.html');
    }
  } catch (e) {
    // If file doesn't exist, fallback to index.html (SPA routing)
    filePath = join(DIST_DIR, 'index.html');
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  } catch (error) {
    res.writeHead(500);
    res.end(`Server Error: ${error.code}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Panel server running on port ${PORT}`);
});
