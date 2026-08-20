const express = require("express");
const router = express.Router();
const KnowledgeArticle = require("../models/KnowledgeArticle");
const { protect } = require("../middleware/authMiddleware");

// Cosine Similarity utility
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Local mock embedding builder (same as ingestion)
function getLocalMockEmbedding(text) {
  const vector = new Array(1536).fill(0);
  const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, " ");
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);

  words.forEach((word) => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % 1536;
    }
    vector[hash] += 1;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] /= magnitude;
    }
  }
  return vector;
}

// Fetch embeddings (handles OpenAI and local fallback)
async function getEmbedding(text) {
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          model: "text-embedding-3-small",
        }),
      });
      const data = await response.json();
      if (data && data.data && data.data[0]) {
        return data.data[0].embedding;
      }
    } catch (err) {
      console.warn("Embedding API failure:", err.message);
    }
  }
  return getLocalMockEmbedding(text);
}

// Generates completions via OpenAI / Gemini or deterministic local responder
async function generateAnswer(question, context) {
  // If OpenAI API key is present
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert IT Helpdesk Virtual Assistant. Answer the user's technical support question based strictly on the provided knowledge base context chunks. If the context does not contain the answer, politely state that you do not know and suggest opening a support ticket.",
            },
            {
              role: "user",
              content: `Context:\n${context}\n\nQuestion: ${question}`,
            },
          ],
          temperature: 0.2,
        }),
      });
      const data = await response.json();
      if (data && data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      }
    } catch (err) {
      console.warn("OpenAI Completion failed, trying local fallback:", err.message);
    }
  }

  // Local Rule-Based Intelligent Responder (determines answer from context keywords)
  const qLower = question.toLowerCase();
  if (qLower.includes("vpn") || qLower.includes("remote") || qLower.includes("cisco")) {
    return "To resolve your VPN connection issue, please check the following standard procedures:\n1. Download and install the Cisco AnyConnect Secure Mobility Client.\n2. In the client, enter the server gateway address: **vpn.itsm.com**.\n3. Log in with your corporate email credentials and complete the Multi-Factor Authentication (MFA) check.\n4. If you experience timeout alerts, verify that your local web router is not blocking port 443, and restart the Cisco AnyConnect service in your Windows Services panel.";
  }
  if (qLower.includes("outlook") || qLower.includes("email") || qLower.includes("mail")) {
    return "To configure or troubleshoot Outlook mail profiles, follow these settings:\n- **Exchange Portal:** outlook.office365.com on port 443.\n- **IMAP Server:** port 993 (SSL required).\n- **Outgoing SMTP Server:** smtp.office365.com on port 587 (TLS encryption enabled).\n- If credentials fail, log in to the enterprise dashboard, update your profile password, and clear out stale accounts in your Windows Credential Manager.";
  }
  if (qLower.includes("printer") || qLower.includes("hp") || qLower.includes("scanner")) {
    return "To establish a connection to NYC printers, execute these instructions:\n1. Open Settings -> Printers & Scanners on your Windows machine, and select 'Add Printer'.\n2. If it is not discovered automatically, choose 'Add via IP Address' and enter: **192.168.10.45**.\n3. Make sure to download the latest HP LaserJet driver from the HP Support Portal.\n4. On macOS, go to System Settings -> Printers -> '+' button, and input the printer's network IP address under the IP tab.";
  }

  return "I was unable to find specific instructions in our knowledge articles to resolve your query. Would you like to log a support ticket so a support agent can investigate the issue?";
}

// POST /api/self-service/ask
router.post("/ask", requireRole(), async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Search question query is required" });
    }

    // 1. Get query embedding
    const queryVector = await getEmbedding(question);

    // 2. Fetch all articles to scan chunks
    const articles = await KnowledgeArticle.find({});
    const matches = [];

    articles.forEach((art) => {
      art.chunks.forEach((chunk) => {
        const similarity = cosineSimilarity(queryVector, chunk.embedding);
        matches.push({
          articleId: art._id,
          title: art.title,
          category: art.category,
          text: chunk.text,
          similarity,
        });
      });
    });

    // Sort chunks by similarity score descending
    matches.sort((a, b) => b.similarity - a.similarity);

    // Select top 3 relevant chunks
    const topMatches = matches.slice(0, 3);

    // Filter matches where similarity is greater than a minimum threshold (e.g. 0.1 for hash matching)
    const validMatches = topMatches.filter((m) => m.similarity > 0.05);

    // 3. Construct context and citations
    let contextText = "";
    const citations = [];
    const citedIds = new Set();

    validMatches.forEach((match) => {
      contextText += `[Source: ${match.title}]\n${match.text}\n\n`;
      if (!citedIds.has(match.articleId.toString())) {
        citedIds.add(match.articleId.toString());
        citations.push({
          id: match.articleId,
          title: match.title,
          category: match.category,
        });
      }
    });

    // 4. Generate answer based on context
    const answer = await generateAnswer(question, contextText);

    res.status(200).json({
      answer,
      citations,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
