# Explorer

Turn any topic into a polished, audio-friendly report anchored by a structured outline.

---

## Project layout

- `backend/` — FastAPI APIs plus report generation domain logic, prompts, and persistence helpers (see `backend/api` for the HTTP layer).
- `cli/` — helper CLI tooling for driving the local report generator and saving generated artifacts.
- `frontends/web/` — web front-end (see `frontends/web/README.md`).
- `frontends/ios/` — upcoming ios app.

---

## Environment configuration

Explorer relies on a handful of environment variables. Export them _in the shell that launches the API or CLI_ (or place them in a `.env` file and `source` it):

- `OPENAI_API_KEY` — required; key used for OpenAI API calls.
- `OPENAI_BASE_URL` — optional; point at a proxy or compatible gateway.
- `EXPLORER_DATABASE_URL` — optional; override the default `sqlite:///data/reportgen.db`.
- `EXPLORER_REPORT_STORAGE_DIR` — optional; persist artifacts somewhere other than `data/reports`.
- `EXPLORER_DEFAULT_USER_EMAIL` — optional; fallback user for API/CLI requests when `user_email` is omitted.
- `EXPLORER_REPORT_STORAGE_MODE` — optional; set to `file` to persist report artifacts without writing to the database.
- `EXPLORER_DATABASE_URL` — optional; override the DB location (defaults to `sqlite:///data/reportgen.db`).
- `EXPLORER_DISABLE_STORAGE` — optional; when set to `1`/`true`, skip writing reports to the DB and filesystem (useful for local, single-user runs where persistence is unnecessary).

Examples:

```bash
# Disable persistence for a local dev session
EXPLORER_DISABLE_STORAGE=1 uvicorn backend.api.app:app --reload --port 8000

```

You can also prefix inline commands:

```bash
OPENAI_API_KEY="sk-your-key" uvicorn backend.api.app:app --reload --port 8000
OPENAI_API_KEY="sk-your-key" python -m cli.stream_report --topic "Future of urban farming"
```

---

## Quickstart

```bash
# 1) (optional) create a virtual environment
python3 -m venv .venv && source .venv/bin/activate

# 2) Install dependencies
pip install -r requirements.txt

# 3) Launch the API (hot reload for local dev)
uvicorn backend.api.app:app --reload --port 8000
```

---

## ChatGPT App (MCP)

This repo includes a minimal MCP server (SSE) plus a tiny Apps SDK frontend for local dev. MCP servers are transport-agnostic and can be served over SSE or Streamable HTTP; this setup uses SSE for compatibility with ChatGPT Apps.

### 1) Start the MCP server

```bash
# From repo root
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export OPENAI_API_KEY="sk-your-key"
export EXPLORER_DEFAULT_USER_EMAIL="you@example.com"

uvicorn mcp_server.app:app --reload --port 8787
```

MCP endpoint for ChatGPT “New App” UI:

```
http://localhost:8787/sse
```

ChatGPT requires HTTPS for deployed MCP servers; local HTTP is fine for dev.

### 2) Start the Apps SDK frontend

```bash
cd app
npm install
APP_MCP_URL="http://localhost:8787/sse" npm run dev
```

The frontend connects to your MCP server, lists tools, and lets you run them with basic JSON-schema-driven forms. The Apps SDK uses the MCP Apps bridge (and `window.openai`) when running inside ChatGPT; locally it connects directly to your MCP server.

### Local dev via HTTPS tunnel (for ChatGPT)

ChatGPT requires HTTPS for MCP servers. For local development, expose your local server using a tunnel and paste the HTTPS URL into ChatGPT. citeturn0search1turn0search2

Example using ngrok:

```bash
# from repo root (MCP server on port 8787)
scripts/tunnel_ngrok.sh 8787 /sse
```

Example using Cloudflare Tunnel:

```bash
scripts/tunnel_cloudflared.sh 8787
```

When the tunnel starts, use the HTTPS URL it prints with the `/sse` path (e.g. `https://<subdomain>.ngrok.app/sse`). citeturn0search0turn0search1

### Hosting options (production)

For production, host the MCP server on a stable, low-latency HTTPS endpoint (Cloudflare Workers, Fly.io, Vercel, AWS, etc.). citeturn0search1

### Next steps

Add or adjust tools in `mcp_server/app.py` as the backend evolves (e.g., new reports, topics, or collections capabilities).

---

## Actions schema

The OpenAPI document to paste into ChatGPT Actions lives at `docs/actions-openapi.yaml`. Update the `servers` URL to match your deployment.

For single-user workflows, set `EXPLORER_DEFAULT_USER_EMAIL` and omit `user_email` from action calls.
If `EXPLORER_REPORT_STORAGE_MODE=file`, report list endpoints will not include file-only runs (they are only written to disk).

---

## Knowledge file workflow (no API)

If you want the GPT to work only from a static knowledge file (no Actions/API), keep a JSON file with your topics and re-upload it whenever you update your list.

- Schema: `docs/topics.schema.json`
- Example: `docs/topics.example.json`

Suggested flow:

1) Copy `docs/topics.example.json` to a working file and edit topics locally.
2) Upload the file as GPT Knowledge.
3) When you add or edit topics, update the file and re-upload it.

---

## Generate reports

`cli/stream_report.py` (run via `python -m cli.stream_report` or `python -m cli`) streams status updates to your terminal, saves finished artifacts under `cli/generated_reports/`, and can optionally persist the raw NDJSON stream. It talks to the FastAPI service you launched in the quickstart, but the HTTP layer is an internal implementation detail—you interact with Explorer through this CLI.

### Report from only a topic (auto-generated outline)

```bash
python -m cli.stream_report --topic "Supply chain resilience in 2025" --show-progress
```

- Streams progress and saves `cli/generated_reports/Supply chain resilience in 2025 report.md`.
- Save the streamed NDJSON (`--raw-stream run.ndjson`) or capture the CLI payload (`--payload-file`) whenever you want to reproduce a run later.

### Report with custom outline

```bash
python -m cli.stream_report --payload-file path/to/your_outline_payload.json --show-progress
```

- Reuses your outline and returns both the outline and finished report (`return="report_with_outline"` in the payload).

### Report with custom models

```bash
python -m cli.stream_report --payload-file path/to/your_models_payload.json --show-progress
```

- Edit the `models` block in the JSON file to target specific OpenAI models (outline → writer → editor). Include `reasoning_effort` when using reasoning-capable models (names starting with `gpt-5`, `o3`, or `o4`).
- Fields you omit fall back to the backend defaults.

### Capture the raw NDJSON stream

```bash
python -m cli.stream_report --topic "Modern Data Governance for AI Teams" --show-progress --raw-stream run.ndjson
```

`httpx` is bundled with `pip install -r requirements.txt`, so reinstalling dependencies per the quickstart keeps the CLI working.

---

## Maintenance

### Resetting local state

If you need to wipe the database and generated reports to start fresh:

```bash
python scripts/reset_explorer_state.py
```
