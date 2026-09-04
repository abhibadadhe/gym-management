// Vercel Serverless Function: Transparent Streaming Proxy to VPS Backend (Port 3001)
import http from 'http';

export const config = {
  api: {
    bodyParser: false, // Stream raw request body directly to VPS (handles JSON, FormData, file uploads)
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const VPS_HOST = '187.127.173.151';
  const VPS_PORT = 3001;

  // Determine subpath from req.url or query
  let subpath = '';
  if (req.query && req.query.path) {
    subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
  } else if (req.query && req.query.media) {
    subpath = 'media/' + (Array.isArray(req.query.media) ? req.query.media.join('/') : req.query.media);
  } else if (req.query && req.query.static) {
    subpath = 'static/' + (Array.isArray(req.query.static) ? req.query.static.join('/') : req.query.static);
  } else {
    const raw = req.url || '';
    subpath = raw.replace(/^\/api\/proxy\??/, '').replace(/^\/api\/?/, '');
  }

  // Preserve any remaining query parameters
  let queryString = '';
  if (req.url && req.url.includes('?')) {
    const params = new URLSearchParams(req.url.split('?')[1]);
    params.delete('path');
    params.delete('media');
    params.delete('static');
    const qs = params.toString();
    if (qs) {
      queryString = '?' + qs;
    }
  }

  subpath = subpath.replace(/^\/+/, '');

  let targetPath;
  if (subpath.startsWith('media/')) {
    targetPath = `/${subpath}${queryString}`;
  } else if (subpath.startsWith('static/')) {
    targetPath = `/${subpath}${queryString}`;
  } else {
    targetPath = `/api/${subpath}${queryString}`;
  }

  // Filter headers to forward
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders.connection;

  const options = {
    hostname: VPS_HOST,
    port: VPS_PORT,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders,
    timeout: 30000,
  };

  return new Promise((resolve) => {
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on('end', () => resolve());
    });

    proxyReq.on('error', (err) => {
      console.error('[VPS Proxy Error]:', err);
      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway: Could not reach VPS backend on port 3001',
          detail: err.message,
          target: `http://${VPS_HOST}:${VPS_PORT}${targetPath}`,
        });
      }
      resolve();
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout connecting to VPS backend',
          target: `http://${VPS_HOST}:${VPS_PORT}${targetPath}`,
        });
      }
      resolve();
    });

    // Pipe incoming request directly to VPS
    req.pipe(proxyReq);
  });
}
