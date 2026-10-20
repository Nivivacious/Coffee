// POST {id}: counts one browser once. GET: the public visitor count.
const { redis, validId } = require('./_redis');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const id = (req.body || {}).id;
    if (req.method === 'POST' && validId(id)) await redis(['SADD', 'tale:visitors', id]);
    const [count] = await redis(['SCARD', 'tale:visitors']);
    res.status(200).json({ count });
  } catch (e) {
    res.status(503).json({ error: 'unavailable' });
  }
};
