module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { messageId } = req.body;
  if (!messageId) return res.status(400).json({ error: 'No messageId' });

  const response = await fetch(
    `https://qstash.upstash.io/v2/messages/${messageId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${process.env.QSTASH_TOKEN}` },
    }
  );

  res.status(response.ok ? 200 : 500).json({ ok: response.ok });
};
