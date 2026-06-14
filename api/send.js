const webpush = require('web-push');
const { Client } = require('@upstash/qstash');
const { Redis } = require('@upstash/redis');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id, text, subscription } = req.body;

  if (!subscription || !text) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ id, text })
    );

    // Reschedule for 15 minutes later
    const client = new Client({ token: process.env.QSTASH_TOKEN });
    const result = await client.publishJSON({
      url: 'https://reminder-kappa-eight.vercel.app/api/send',
      body: { id, text, subscription },
      delay: 15 * 60,
    });

    // Update Redis with the new messageId so cancel always works
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    await redis.set(`reminder:${id}`, result.messageId, { ex: 60 * 60 * 24 * 30 });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
};
