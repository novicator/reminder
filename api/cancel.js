const { Redis } = require('@upstash/redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { reminderId } = req.body;
  if (!reminderId) return res.status(400).json({ error: 'No reminderId' });

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const messageId = await redis.get(`reminder:${reminderId}`);

    if (messageId) {
      await fetch(`https://qstash.upstash.io/v2/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
      });
      await redis.del(`reminder:${reminderId}`);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
