module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { id, text, scheduledTime, subscription } = req.body;

  if (!id || !text || !scheduledTime || !subscription) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  if (scheduledTime <= Date.now()) {
    return res.status(400).json({ error: 'Time must be in the future' });
  }

  const baseUrl = process.env.API_BASE_URL || `https://${process.env.VERCEL_URL}`;
  const sendUrl = `${baseUrl}/api/send`;
  const notBefore = Math.floor(scheduledTime / 1000);

  const response = await fetch(
    `https://qstash.upstash.io/v2/publish/${encodeURIComponent(sendUrl)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Not-Before': String(notBefore),
      },
      body: JSON.stringify({ id, text, subscription }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('QStash error:', data);
    return res.status(500).json({ error: 'Failed to schedule' });
  }

  res.status(200).json({ messageId: data.messageId });
};
