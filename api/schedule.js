const { Client } = require('@upstash/qstash');
const { Redis } = require('@upstash/redis');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id, text, scheduledTime, subscription } = req.body;

  if (!id || !text || !scheduledTime || !subscription) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (scheduledTime <= Date.now()) {
    return res.status(400).json({ error: 'Time must be in the future' });
  }

  try {
    const client = new Client({ token: process.env.QSTASH_TOKEN });

    const result = await client.publishJSON({
      url: 'https://reminder-kappa-eight.vercel.app/api/send',
      body: { id, text, subscription },
      notBefore: Math.floor(scheduledTime / 1000),
    });

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    await redis.set(`reminder:${id}`, result.messageId, { ex: 60 * 60 * 24 * 30 });

    res.status(200).json({ messageId: result.messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
