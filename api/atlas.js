export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const { birdName } = req.body;
  if (!birdName) {
    return res.status(400).json({ error: 'birdName is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Jsi ornitologický atlas. Pro ptáka "${birdName}" napiš stručný JSON (bez markdown backticks) s těmito poli:
{
  "latin": "latinský název",
  "size": "velikost v cm",
  "habitat": "typické prostředí (1 věta)",
  "description": "stručný popis vzhledu (2 věty)",
  "behavior": "chování a zvyky (1-2 věty)",
  "song": "popis zpěvu/hlasu (1 věta)",
  "interesting": "zajímavost o druhu (1 věta)"
}
Odpověz POUZE čistý JSON, žádný další text.`
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch bird info', details: e.message });
  }
}
