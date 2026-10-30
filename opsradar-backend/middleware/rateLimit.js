// Single-process bounded limiter. Production deployments with replicas need a shared store.
function rateLimit({ limit = 30, windowMs = 60000 } = {}) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of entries) if (value.until <= now) entries.delete(key);
    const key = req.ip;
    let entry = entries.get(key);
    if (!entry) {
      if (entries.size >= 10000) return res.status(429).json({ error: 'Please try again shortly' });
      entry = { count: 0, until: now + windowMs }; entries.set(key, entry);
    }
    if (++entry.count > limit) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ error: 'Too many attempts. Try again shortly.' }); }
    next();
  };
}
module.exports = { rateLimit };
