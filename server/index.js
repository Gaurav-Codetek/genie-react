import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getForwardedUserToken,
  getPublicConfig,
  invokeServingEndpoint,
  normalizeMessages
} from "./databricks.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const app = express();
const port = Number(process.env.PORT || process.env.DATABRICKS_APP_PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/config", (req, res) => {
  res.json(getPublicConfig(req));
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = normalizeMessages(req.body?.messages);
    const token = getForwardedUserToken(req);
    const result = await invokeServingEndpoint({ messages, token });

    res.json({
      message: {
        role: "assistant",
        content: result.text
      },
      rawResponse: result.rawResponse,
      request: result.request,
      config: getPublicConfig(req)
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || "Unexpected server error.",
      details: error.details
    });
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }

    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Supervisor agent chat app listening on port ${port}`);
});
