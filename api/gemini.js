export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { prompt, systemPrompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: `시스템 지침: ${systemPrompt}\n\n사용자 질문: ${prompt}` }] }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1200, stopSequences: ["[END]"] }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data?.error?.message || "Gemini error" });

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    text = text.replace("[O.K.]", "").trim();
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
