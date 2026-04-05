#!/usr/bin/env node

import http from "node:http";
import { spawn } from "node:child_process";

const EXTERNAL_PORT = parseInt(process.env.WRAPPER_PORT || "3006", 10);
const INTERNAL_PORT = EXTERNAL_PORT + 1000;
const CONFIG = process.env.WRAPPER_CONFIG || ".\\superassistant-config.json";

let activeSseClient = false;

function log(...args) {
  console.log("[wrapper]", ...args);
}

function logError(...args) {
  console.error("[wrapper]", ...args);
}

function stripOutputSchema(jsonStr) {
  try {
    const msg = JSON.parse(jsonStr);
    const tools = msg?.result?.tools;

    if (Array.isArray(tools)) {
      for (const tool of tools) {
        delete tool.outputSchema;
      }
      return JSON.stringify(msg);
    }
  } catch {
    // pass through unchanged
  }

  return jsonStr;
}

const child = spawn(
  "npx",
  [
    "-y",
    "@srbhptl39/mcp-superassistant-proxy@latest",
    "--config",
    CONFIG,
    "--outputTransport",
    "sse",
    "--port",
    String(INTERNAL_PORT),
  ],
  {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
  }
);

child.on("error", (err) => {
  logError("Failed to start upstream proxy:", err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  logError(`Upstream proxy exited. code=${code ?? "null"} signal=${signal ?? "null"}`);
  process.exit(code ?? 1);
});

// Give upstream more time to start on Windows
await new Promise((resolve) => setTimeout(resolve, 5000));

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/sse")) {
    if (activeSseClient) {
      log("Rejected extra SSE client");
      res.writeHead(409, { "content-type": "text/plain; charset=utf-8" });
      res.end("Only one SSE client is allowed");
      return;
    }

    activeSseClient = true;
    log("Accepted SSE client");

    let released = false;
    const releaseClient = () => {
      if (!released) {
        released = true;
        activeSseClient = false;
        log("SSE client released");
      }
    };

    req.on("close", releaseClient);
    res.on("close", releaseClient);
    res.on("finish", releaseClient);

    const upstream = http.request(
      {
        hostname: "localhost",
        port: INTERNAL_PORT,
        path: req.url,
        method: "GET",
        headers: req.headers,
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 500, upRes.headers);

        let buffer = "";

        upRes.on("data", (chunk) => {
          buffer += chunk.toString();

          let idx;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);

            const filtered = event
              .split("\n")
              .map((line) => {
                if (line.startsWith("data:")) {
                  const payload = line.slice("data:".length).trimStart();
                  return "data: " + stripOutputSchema(payload);
                }
                return line;
              })
              .join("\n");

            res.write(filtered + "\n\n");
          }
        });

        upRes.on("end", () => {
          if (buffer.length > 0) {
            res.write(buffer);
          }
          res.end();
          releaseClient();
        });

        upRes.on("close", releaseClient);
      }
    );

    upstream.on("error", (e) => {
      logError("SSE upstream error:", e.message);
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      }
      res.end("upstream error");
      releaseClient();
    });

    upstream.end();
    return;
  }

  const chunks = [];

  req.on("data", (c) => chunks.push(c));

  req.on("end", () => {
    const body = Buffer.concat(chunks);

    const upstream = http.request(
      {
        hostname: "localhost",
        port: INTERNAL_PORT,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          "content-length": String(body.length),
        },
      },
      (upRes) => {
        res.writeHead(upRes.statusCode || 500, upRes.headers);
        upRes.pipe(res);
      }
    );

    upstream.on("error", (e) => {
      logError("HTTP upstream error:", e.message);
      if (!res.headersSent) {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      }
      res.end("upstream error");
    });

    if (body.length > 0) {
      upstream.write(body);
    }
    upstream.end();
  });
});

server.listen(EXTERNAL_PORT, () => {
  log(`Filtering proxy on :${EXTERNAL_PORT} -> upstream :${INTERNAL_PORT}`);
  log("Stripping outputSchema from tools/list responses");
  log(`Using config: ${CONFIG}`);
  log(`Connect extension to http://localhost:${EXTERNAL_PORT}/sse`);
});

function shutdown() {
  try {
    child.kill();
  } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);