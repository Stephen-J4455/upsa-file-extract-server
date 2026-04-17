require("dotenv").config();

const cors = require("cors");
const express = require("express");
const multer = require("multer");

const { extractTextFromFile } = require("./extractors");

const app = express();

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 30);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(1, maxFileSizeMb) * 1024 * 1024,
  },
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    service: "upsa-file-extract-server",
    mode: "extract-only",
  });
});

app.post(["/extract-text", "/api/extract-text"], upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use multipart/form-data with field name 'file'." });
    }

    const text = await extractTextFromFile(req.file);

    res.json({
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      textLength: text.length,
      text,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: `File too large. Increase MAX_FILE_SIZE_MB (currently ${maxFileSizeMb}).`,
      });
    }
    return res.status(400).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return res.status(500).json({ error: message });
});

module.exports = app;