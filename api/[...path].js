// Vercel Serverless Function: Proxy to VPS Backend (Port 3001)
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

  const VPS_BASE = process.env.VPS_BACKEND_URL || 'http://187.127.173.151:3001';

  // Determine subpath from req.url
  // Example req.url: /api/auth/login/ or /api/members/?search=test
  let requestPath = req.url || '';
  let queryString = '';
  if (requestPath.includes('?')) {
    const parts = requestPath.split('?');
    requestPath = parts[0];
    queryString = '?' + parts[1];
  }

  let targetUrl;
  if (requestPath.startsWith('/media')) {
    const sub = requestPath.replace(/^\/media\/?/, '');
    targetUrl = `${VPS_BASE}/media/${sub}${queryString}`;
  } else if (requestPath.startsWith('/static')) {
    const sub = requestPath.replace(/^\/static\/?/, '');
    targetUrl = `${VPS_BASE}/static/${sub}${queryString}`;
  } else {
    const sub = requestPath.replace(/^\/api\/?/, '');
    targetUrl = `${VPS_BASE}/api/${sub}${queryString}`;
  }

  // Filter headers to forward
  const forwardHeaders = {};
  for (const [key, val] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (!['host', 'connection', 'content-length'].includes(lower)) {
      forwardHeaders[key] = val;
    }
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: forwardHeaders,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
        fetchOptions.body = JSON.stringify(req.body);
        if (!forwardHeaders['content-type']) {
          fetchOptions.headers['content-type'] = 'application/json';
        }
      } else if (req.body) {
        fetchOptions.body = req.body;
      }
    }

    const response = await fetch(targetUrl, fetchOptions);

    res.status(response.status);

    response.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(lower)) {
        res.setHeader(key, val);
      }
    });

    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[Vercel VPS Proxy Error]:', err);
    return res.status(502).json({
      error: 'Proxy Error connecting to VPS backend',
      detail: err.message,
      target: targetUrl,
    });
  }
}
