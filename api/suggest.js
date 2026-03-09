export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { query } = req.body;
  if (!query || query.length < 2) return res.status(400).json({ suggestions: [] });

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
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Jsi ornitologický atlas ptáků žijících v Česku a střední Evropě. Uživatel hledá ptáka a zadal: "${query}".

Vrať JSON pole max 8 návrhů ptáků, kteří odpovídají zadanému textu. Hledej podle českého názvu.
Každý návrh má formát: {"name": "český název", "latin": "latinský název", "category": "kategorie"}

Kategorie jsou: "pevci", "dravci", "vodni", "splhavci", "ostatni"

Odpověz POUZE čistý JSON pole, žádný další text. Příklad:
[{"name":"Kos černý","latin":"Turdus merula","category":"pevci"}]`
        }],
      }),
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('') || '[]';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const suggestions = JSON.parse(cleaned);
    return res.status(200).json({ suggestions });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to get suggestions', suggestions: [] });
  }
}
