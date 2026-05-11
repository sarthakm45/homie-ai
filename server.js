const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const CONTACTS_FILE = path.join(__dirname, "contacts.json");
const MAX_REQUEST_SIZE = 1_000_000;

const profile = {
  bio: "Helping creators and brands stand out with clean, high-retention edits.",
  about:
    "I am a professional editor focused on story pacing, color, and sound polish for social media and commercial projects.",
};

const projects = [
  {
    id: 1,
    title: "Creator Reel Pack",
    description: "30 short-form edits for a lifestyle creator with caption and beat sync.",
    category: "Social Media",
  },
  {
    id: 2,
    title: "Brand Launch Promo",
    description: "High-energy promo cut with product shots, motion text, and sound design.",
    category: "Commercial",
  },
  {
    id: 3,
    title: "Podcast Highlights",
    description: "Multi-camera highlight clips and hooks optimized for YouTube Shorts.",
    category: "Long-form to Short-form",
  },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_REQUEST_SIZE) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

async function saveContact(contact) {
  let existing = [];

  try {
    const text = await fs.promises.readFile(CONTACTS_FILE, "utf8");
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      existing = parsed;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  existing.push({ ...contact, createdAt: new Date().toISOString() });
  await fs.promises.writeFile(CONTACTS_FILE, JSON.stringify(existing, null, 2), "utf8");
}

function isValidContact({ name, email, message }) {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return (
    typeof name === "string" &&
    typeof email === "string" &&
    typeof message === "string" &&
    name.trim().length >= 2 &&
    emailRegex.test(email) &&
    !email.includes("..") &&
    message.trim().length >= 10
  );
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/profile") {
    sendJson(res, 200, profile);
    return true;
  }

  if (req.method === "GET" && req.url === "/api/projects") {
    sendJson(res, 200, projects);
    return true;
  }

  if (req.method === "POST" && req.url === "/api/contact") {
    try {
      const data = await parseJsonBody(req);
      if (!isValidContact(data)) {
        sendJson(res, 400, {
          error: "Please provide valid name, email, and a message of at least 10 characters.",
        });
        return true;
      }

      await saveContact({
        name: data.name.trim(),
        email: data.email.trim(),
        message: data.message.trim(),
      });

      sendJson(res, 201, { message: "Thanks! Your message was received." });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid request body" });
    }
    return true;
  }

  return false;
}

function serveStatic(req, res) {
  const requested = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (!handled) {
    serveStatic(req, res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
