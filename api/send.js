const webpush = require('web-push');
const { Receiver } = require('@upstash/qstash');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
  });

  try {
    await receiver.verify({
      signature: req.headers['upstash-signature'],
      body: rawBody,
    });
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id, text, subscription } = JSON.parse(rawBody);

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
}

handler.config = { api: { bodyParser: false } };

module.exports = handler;
