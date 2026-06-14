const webpush = require('web-push');

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
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Push error:', err);
    res.status(500).json({ error: err.message });
  }
};
