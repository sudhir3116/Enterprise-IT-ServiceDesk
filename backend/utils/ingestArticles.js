const mongoose = require("mongoose");
const dotenv = require("dotenv");
const KnowledgeArticle = require("../models/KnowledgeArticle");

dotenv.config();

// Predefined seed articles
const seedArticles = [
  {
    title: "How to connect and troubleshoot corporate VPN issues",
    body: "To connect to the corporate VPN, download and install the Cisco AnyConnect Secure Mobility Client. Open the client, enter the portal URL: vpn.itsm.com. Authenticate using your enterprise email address and password. Enter your multi-factor authentication (MFA) passcode when prompted. If you experience connection timeout errors, verify that your local network is active, check if port 443 is blocked by your local router, and restart the Cisco AnyConnect service in Windows Services.",
    category: "Network",
    tags: ["vpn", "network", "remote", "cisco", "mfa"],
  },
  {
    title: "Configuring Microsoft Outlook email profiles",
    body: "Outlook settings for corporate emails require automatic sync profiles. Open Outlook, select Add Account, and enter your email address. Choose Exchange/Office 365. Server: outlook.office365.com, Port: 443. Incoming mail protocol: IMAP port 993 (SSL required), Outgoing SMTP server: smtp.office365.com on port 587 (TLS encryption). If authentication fails, reset your password in the portal directory and clear credentials in Windows Credential Manager.",
    category: "Software",
    tags: ["email", "outlook", "mail", "server", "office"],
  },
  {
    title: "How to install office printer drivers",
    body: "To connect to the network printer on Windows, go to Settings -> Devices -> Printers & Scanners. Click Add a printer or scanner. Select the printer matching printer-nyc-hq-02.itsm.local. If it does not appear, click The printer that I want isn't listed, choose Add a printer using an IP address, and enter the IP address 192.168.10.45. Download the latest HP LaserJet driver from the HP Support Portal. For macOS, open System Settings, select Printers, click the + button, and select the IP tab.",
    category: "Hardware",
    tags: ["printer", "hp", "office", "hardware", "windows"],
  },
];

// Helper: Sliding window text chunker
function chunkText(text, size = 500, overlap = 100) {
  const chunks = [];
  let index = 0;
  while (index < text.length) {
    const chunk = text.slice(index, index + size);
    chunks.push(chunk);
    index += (size - overlap);
  }
  return chunks;
}

// Helper: Generate deterministic keyword-hash mock embedding
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

// Main embedding interface
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
      console.warn("OpenAI Embedding API failed, falling back to local hash:", err.message);
    }
  }
  return getLocalMockEmbedding(text);
}

const ingest = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/itsm_db";
    await mongoose.connect(mongoUri);
    console.log("Connected to database. Purging old knowledge articles...");
    await KnowledgeArticle.deleteMany({});

    for (const art of seedArticles) {
      console.log(`Processing article: "${art.title}"`);
      const chunks = chunkText(art.body);
      const chunkDocs = [];

      for (const text of chunks) {
        const embedding = await getEmbedding(text);
        chunkDocs.push({ text, embedding });
      }

      await KnowledgeArticle.create({
        title: art.title,
        body: art.body,
        category: art.category,
        tags: art.tags,
        chunks: chunkDocs,
      });
      console.log(`Saved "${art.title}" with ${chunks.length} chunks.`);
    }

    console.log("Knowledge Base successfully ingested.");
    process.exit(0);
  } catch (err) {
    console.error("Ingestion failed:", err.message);
    process.exit(1);
  }
};

ingest();
