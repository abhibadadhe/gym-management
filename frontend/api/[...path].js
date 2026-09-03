export default async function handler(req, res) {
  const VPS_TARGET = 'http://187.127.173.151:3001';
  const targetUrl = `${VPS_TARGET}${req.url}`;

  // Forward headers (excluding host and connection)
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders.connection;

  const fetchOptions = {
    method: req.method,
    headers: forwardHeaders,
  };

  // Forward body for non-GET/HEAD methods
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body) {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      if (typeof req.body === 'object' && !forwardHeaders['content-type']) {
        fetchOptions.headers['content-type'] = 'application/json';
      }
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);

    // Forward status code
    res.status(response.status);

    // Forward response headers
    response.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(lower)) {
        res.setHeader(name, value);
      }
    });

    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('API Proxy Error to VPS:', err);
    return res.status(502).json({
      error: 'Proxy Error connecting to VPS backend',
      detail: err.message,
    });
  }
}
