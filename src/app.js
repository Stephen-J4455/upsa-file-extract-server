const cors = require("cors");
const express = require("express");
const multer = require("multer");

const { extractTextFromFile } = require("./extractors");

const app = express();

const MAX_FILE_SIZE_MB = 30;
const MAX_FILE_SIZE_BYTES = Math.max(1, MAX_FILE_SIZE_MB) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});
const rawUpload = express.raw({
  type: () => true,
  limit: `${MAX_FILE_SIZE_MB}mb`,
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

app.post(["/extract-text", "/api/extract-text"], (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.single("file")(req, res, next);
  }

  return rawUpload(req, res, next);
}, async (req, res, next) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : null;
    const originalName = String(req.file?.originalname || req.header("x-file-name") || "uploaded-file");
    const mimeType = String(req.file?.mimetype || req.header("content-type") || "application/octet-stream");

    if (!req.file && !rawBody) {
      return res.status(400).json({
        error: "No file uploaded. Use multipart/form-data with field name 'file' or send a binary body with X-File-Name.",
      });
    }

    const text = await extractTextFromFile(
      req.file || {
        buffer: rawBody,
        originalname: originalName,
        mimetype: mimeType,
        size: rawBody.length,
      },
    );

    res.json({
      filename: req.file?.originalname || originalName,
      mimeType: req.file?.mimetype || mimeType,
      sizeBytes: req.file?.size || rawBody.length,
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
        error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
      });
    }
    return res.status(400).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  const isExpectedClientError =
    message.startsWith("No valid uploaded file was provided.") ||
    message.startsWith("No file uploaded.") ||
    message.startsWith("Unsupported file type:") ||
    message.startsWith("Legacy .doc and .ppt are not supported") ||
    message.startsWith("No readable text found inside this PPTX file.");

  return res.status(isExpectedClientError ? 422 : 500).json({ error: message });
});

module.exports = app;