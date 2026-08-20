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

## Deploying the Asset API

New asset registration uses the authenticated `POST /api/assets` endpoint to authorize the user, generate a unique asset code atomically, and write the asset with the Firebase Admin SDK. A static Cloudflare Worker deployment supplies the frontend files only; it does **not** run the Express routes in `server.ts`. Therefore, a static deployment that has no separately deployed Node API will fail when the registration form posts to `/api/assets`.

Use one of the following production layouts. The simplest option is a single Node deployment that serves both the built frontend and the API, using `npm run build` followed by `npm start`. When hosting the Vite frontend separately on Cloudflare, deploy the Node API to a Node-compatible runtime, then set the following values in the deployment environments:

| Environment | Variable | Value |
|---|---|---|
| Cloudflare frontend build | `VITE_API_BASE_URL` | Public base URL of the Node API, for example `https://api.example.com` |
| Node API runtime | `CORS_ALLOWED_ORIGIN` | Exact public Cloudflare frontend origin, for example `https://app.example.com` |
| Node API runtime | `GOOGLE_SERVICE_ACCOUNT_JSON` | Firebase/Google service-account JSON; store as a secret and never commit it |
| Node API runtime | `GOOGLE_DRIVE_FOLDER_ID` | Approved Google Drive root-folder ID, if Drive features are used |

After deployment, open `https://<api-host>/api/health`. It must return a healthy JSON response before users register assets. The registration form now shows the API response, including permission failures or a missing endpoint, instead of only displaying the generic “Error saving asset” alert.

### Local verification

```bash
npm ci
npm test
npm run lint
npm run build
npm start
```

Then open the local app, sign in with a user assigned `super_admin`, `it_supervisor`, or `asset_editor`, and register a test asset. The server intentionally rejects other roles with a `403` response.
