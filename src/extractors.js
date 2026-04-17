const JSZip = require("jszip");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

function extensionOf(name = "") {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#xA;/gi, "\n")
    .replace(/&#10;/g, "\n");
}

function normalizeExtractedText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPptxText(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const slideEntries = Object.keys(zip.files)
    .filter((key) => /^ppt\/slides\/slide\d+\.xml$/i.test(key))
    .sort((a, b) => {
      const aNum = Number((a.match(/slide(\d+)\.xml/i) || [])[1] || 0);
      const bNum = Number((b.match(/slide(\d+)\.xml/i) || [])[1] || 0);
      return aNum - bNum;
    });

  const notesEntries = Object.keys(zip.files)
    .filter((key) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(key))
    .sort((a, b) => {
      const aNum = Number((a.match(/notesSlide(\d+)\.xml/i) || [])[1] || 0);
      const bNum = Number((b.match(/notesSlide(\d+)\.xml/i) || [])[1] || 0);
      return aNum - bNum;
    });

  const allEntries = [...slideEntries, ...notesEntries];
  const textParts = [];

  for (const entry of allEntries) {
    const xml = await zip.files[entry].async("string");
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];

    for (const match of matches) {
      const inner = match
        .replace(/^<a:t[^>]*>/, "")
        .replace(/<\/a:t>$/, "");
      const decoded = decodeXmlEntities(inner).trim();
      if (decoded) textParts.push(decoded);
    }
  }

  if (!textParts.length) {
    throw new Error("No readable text found inside this PPTX file.");
  }

  return normalizeExtractedText(textParts.join("\n"));
}

async function extractTextFromFile(file) {
  if (!file?.buffer || !file.originalname) {
    throw new Error("No valid uploaded file was provided.");
  }

  const ext = extensionOf(file.originalname);
  const mime = String(file.mimetype || "").toLowerCase();

  if (
    mime.startsWith("text/") ||
    [".txt", ".md", ".csv", ".json", ".xml"].includes(ext)
  ) {
    return normalizeExtractedText(file.buffer.toString("utf8"));
  }

  if (ext === ".pdf" || mime === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    return normalizeExtractedText(parsed.text);
  }

  if (
    ext === ".docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeExtractedText(result.value);
  }

  if (
    ext === ".pptx" ||
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return extractPptxText(file.buffer);
  }

  if (ext === ".doc" || ext === ".ppt") {
    throw new Error(
      "Legacy .doc and .ppt are not supported by this server. Please convert to .docx/.pptx or PDF."
    );
  }

  throw new Error(
    `Unsupported file type: ${ext || mime || "unknown"}. Supported: txt, md, csv, json, xml, pdf, docx, pptx.`
  );
}

module.exports = {
  extractTextFromFile,
  normalizeExtractedText,
};
