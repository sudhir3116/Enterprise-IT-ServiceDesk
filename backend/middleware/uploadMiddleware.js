const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { ValidationError } = require("../utils/appError");

// Ensure upload directory exists locally
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Disk storage engine (S3 / Cloudinary ready abstraction)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// MIME Type Whitelist
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "application/json",
]);

// Extension Whitelist
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".txt", ".json", ".log"]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new ValidationError(
        `Invalid file type (${file.mimetype}). Allowed types: JPG, PNG, WEBP, GIF, PDF, TXT, JSON, LOG.`
      ),
      false
    );
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
    files: 5,                   // Max 5 attachments per request
  },
  fileFilter,
});

module.exports = upload;
