export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = String(body.prompt || '').trim();
    const systemPrompt = String(body.systemPrompt || '').trim();

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt
                ? `시스템 지침:\n${systemPrompt}\n\n사용자 요청:\n${prompt}`
                : prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        topP: 0.95,
        maxOutputTokens: 1024
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
      ]
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      const message = data?.error?.message || 'Gemini request failed';
      return res.status(r.status || 500).json({ error: message });
    }

    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p?.text || '').join('').trim() || '';

    if (!text) {
      const finishReason = candidate?.finishReason || 'UNKNOWN';
      return res.status(502).json({ error: `Empty response (finishReason: ${finishReason})` });
    }

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
