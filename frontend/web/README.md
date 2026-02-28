# Explorer Web Frontend

A modern React application for the Explorer Copilot, built with Vite.

## Running Locally

Preferred:

```bash
# From the project root
./scripts/dev.sh
```

This starts both the backend and frontend and loads the repo-level `.env` automatically if present.

If you prefer separate terminals, start them independently:

```bash
# Terminal 1
./scripts/dev-backend.sh

# Terminal 2
./scripts/dev-frontend.sh
```

Manual setup:

1. **Start the Backend**:
   Ensure the FastAPI service is running (usually on port 8000):
   ```bash
   # From the project root
   uvicorn backend.api.main:app --reload --port 8000
   ```

2. **Start the Frontend**:
   ```bash
   cd frontend/web
   npm install  # If you haven't already
   npm run dev
   ```

3. **Visit the App**:
   Open `http://localhost:5173` in your browser.

   *Note: If your API runs on a different host/port, you can override the API base by appending `?apiBase=http://your-api-url` to the URL. This setting is cached in `localStorage`.*
