const axios = require("axios");
const { setCors } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, numHashtags } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a social media hashtag expert. Return ONLY hashtags, one per line.' },
          { role: 'user', content: `Generate ${numHashtags || 5} relevant hashtags for: ${text}` }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );

    const hashtagText = openaiResponse.data.choices[0].message.content;
    const hashtags = hashtagText.split('\n').map(t => t.trim()).filter(t => t.startsWith('#')).slice(0, numHashtags || 5);

    res.status(200).json({ success: true, hashtags });
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate hashtags" });
  }
};
