import "./style.css";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const app = document.querySelector("#app");

const state = {
  status: "idle",
  statusDetail: "",
  tools: [],
  client: null,
  results: {},
  error: null,
};

const MCP_URL =
  import.meta.env.APP_MCP_URL ||
  import.meta.env.VITE_APP_MCP_URL ||
  "http://localhost:8787/sse";

function setStatus(status, detail = "") {
  state.status = status;
  state.statusDetail = detail;
  render();
}

function setError(err) {
  state.error = err;
  render();
}

function formatStatus() {
  if (state.status === "connected") return "Connected";
  if (state.status === "connecting") return "Connecting...";
  if (state.status === "error") return "Error";
  return "Disconnected";
}

function statusClass() {
  if (state.status === "connected") return "status ok";
  if (state.status === "error") return "status err";
  return "status";
}

function buildTransport(url) {
  const normalized = url.toLowerCase();
  if (normalized.endsWith("/sse")) {
    return new SSEClientTransport(new URL(url));
  }
  return new StreamableHTTPClientTransport(new URL(url));
}

async function connect() {
  setStatus("connecting", `Connecting to ${MCP_URL}`);
  try {
    const transport = buildTransport(MCP_URL);
    const client = new Client(
      { name: "Explorer App", version: "0.1.0" },
      { transport }
    );
    await client.connect();
    const toolResponse = await client.listTools();
    state.client = client;
    state.tools = toolResponse.tools ?? [];
    setStatus("connected", `Connected to ${MCP_URL}`);
  } catch (err) {
    setStatus("error", `Failed to connect to ${MCP_URL}`);
    setError(err instanceof Error ? err.message : String(err));
  }
}

async function callTool(name, args) {
  if (window.openai && typeof window.openai.callTool === "function") {
    return await window.openai.callTool(name, args);
  }
  if (!state.client) {
    throw new Error("MCP client not connected");
  }
  return await state.client.callTool({ name, arguments: args });
}

function render() {
  if (!app) return;
  app.innerHTML = "";

  const header = document.createElement("header");
  const title = document.createElement("h1");
  title.textContent = "Explorer MCP Tools";
  const status = document.createElement("div");
  status.className = statusClass();
  status.textContent = `${formatStatus()} ${state.statusDetail}`.trim();
  header.append(title, status);

  const toolsPanel = document.createElement("section");
  toolsPanel.className = "panel";
  const toolsTitle = document.createElement("h2");
  toolsTitle.textContent = "Tools";
  toolsPanel.appendChild(toolsTitle);

  const toolsList = document.createElement("div");
  toolsList.className = "tools";

  if (state.tools.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No tools loaded yet.";
    toolsList.appendChild(empty);
  }

  state.tools.forEach((tool) => {
    const toolCard = document.createElement("div");
    toolCard.className = "tool";

    const name = document.createElement("h3");
    name.textContent = tool.name;

    const desc = document.createElement("p");
    desc.textContent = tool.description || "No description";

    const form = document.createElement("form");

    const schema = tool.inputSchema || { properties: {} };
    const properties = schema.properties || {};
    const required = new Set(schema.required || []);

    Object.entries(properties).forEach(([key, propSchema]) => {
      const row = document.createElement("div");
      row.className = "form-row";
      const label = document.createElement("label");
      label.textContent = required.has(key) ? `${key} *` : key;

      let input;
      const type = propSchema.type || "string";
      if (type === "boolean") {
        input = document.createElement("input");
        input.type = "checkbox";
      } else if (type === "number" || type === "integer") {
        input = document.createElement("input");
        input.type = "number";
      } else if (type === "array" || type === "object") {
        input = document.createElement("textarea");
        input.placeholder = type === "array" ? "[]" : "{}";
      } else {
        input = document.createElement("input");
        input.type = "text";
      }

      input.dataset.key = key;
      input.dataset.type = type;

      row.append(label, input);
      form.appendChild(row);
    });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Run";
    submit.disabled = state.status !== "connected";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const args = {};
      let parseError = null;

      form.querySelectorAll("[data-key]").forEach((input) => {
        const key = input.dataset.key;
        const type = input.dataset.type;
        let value;

        if (type === "boolean") {
          value = input.checked;
        } else if (type === "number") {
          value = input.value === "" ? undefined : Number(input.value);
        } else if (type === "integer") {
          value = input.value === "" ? undefined : parseInt(input.value, 10);
        } else if (type === "array" || type === "object") {
          if (input.value === "") {
            value = undefined;
          } else {
            try {
              value = JSON.parse(input.value);
            } catch (err) {
              parseError = `Invalid JSON for ${key}`;
            }
          }
        } else {
          value = input.value === "" ? undefined : input.value;
        }

        if (value !== undefined) {
          args[key] = value;
        }
      });

      if (parseError) {
        state.results[tool.name] = { error: parseError };
        render();
        return;
      }

      const missing = [...required].filter((key) => !(key in args));
      if (missing.length) {
        state.results[tool.name] = { error: `Missing required: ${missing.join(", ")}` };
        render();
        return;
      }

      state.results[tool.name] = { pending: true };
      render();

      try {
        const result = await callTool(tool.name, args);
        state.results[tool.name] = { result };
      } catch (err) {
        state.results[tool.name] = { error: err instanceof Error ? err.message : String(err) };
      }
      render();
    });

    form.appendChild(submit);

    toolCard.append(name, desc, form);
    toolsList.appendChild(toolCard);
  });

  toolsPanel.appendChild(toolsList);

  const resultPanel = document.createElement("section");
  resultPanel.className = "panel";
  const resultTitle = document.createElement("h2");
  resultTitle.textContent = "Results";
  resultPanel.appendChild(resultTitle);

  if (state.error) {
    const error = document.createElement("div");
    error.className = "error";
    error.textContent = state.error;
    resultPanel.appendChild(error);
  }

  if (Object.keys(state.results).length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Run a tool to see results here.";
    resultPanel.appendChild(empty);
  } else {
    Object.entries(state.results).forEach(([toolName, payload]) => {
      const block = document.createElement("div");
      const label = document.createElement("p");
      label.textContent = toolName;
      const pre = document.createElement("pre");
      pre.className = "result";
      pre.textContent = JSON.stringify(payload, null, 2);
      block.append(label, pre);
      resultPanel.appendChild(block);
    });
  }

  app.append(header, toolsPanel, resultPanel);
}

render();
connect();
