# UPSA File Extract Server

Standalone Node.js service for:
- Extracting text from files

## Supported file types
- .txt, .md, .csv, .json, .xml
- .pdf
- .docx
- .pptx

Notes:
- Legacy .doc and .ppt are rejected (convert to .docx/.pptx or PDF first).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
# then edit .env
```

3. Start server:

```bash
npm run dev
# or
npm start
```

Server default URL: http://localhost:8088

## Deploy To Vercel

This project includes a Vercel serverless entry at `api/index.js`.

1. Create a Vercel project from this folder.
2. Add environment variables from `.env.example` in Vercel Project Settings.
3. Deploy.

After deploy:

- `https://YOUR_APP.vercel.app/health`
- `https://YOUR_APP.vercel.app/extract-text`

`vercel.json` rewrites these root paths to the serverless function endpoints.

## Environment variables

- PORT: Server port (default 8088)
- MAX_FILE_SIZE_MB: Upload limit in MB (default 30)

## Endpoints

### GET /health
Returns health status.

On Vercel, `/api/health` is also available.

### POST /extract-text
Extracts raw text from uploaded file.

Form-data:
- file: uploaded file

Example:

```bash
curl -X POST http://localhost:8088/extract-text \
  -F "file=@/path/to/lecture.pdf"
```

On Vercel, `/api/extract-text` is also available.
