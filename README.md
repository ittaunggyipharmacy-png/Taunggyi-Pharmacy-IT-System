# TP IT Management System

Enterprise Internal IT Management, Asset Tracking, Ticket Helpdesk, and Operations Portal.

## Environment Configuration

Configure the required server-side environment variables in your server environment or `.env` file:

```env
# Server Port (defaults to 3000)
PORT=3000

# Google Service Account JSON for Google Drive API integration (Server-side only)
GOOGLE_SERVICE_ACCOUNT_JSON=

# Google Drive Root Folder ID for IT Document Storage
GOOGLE_DRIVE_FOLDER_ID=

# Gemini API Key (Server-side only, if AI features are enabled)
GEMINI_API_KEY=
```

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build and test:
   ```bash
   npm test
   npm run build
   ```
