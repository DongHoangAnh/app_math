import "dotenv/config";
import http from "http";
import { setupGameShowWS } from "./gameshow-ws";
import { testSupabaseConnection } from "./supabase-server";

const PORT = Number(process.env.PORT ?? 3000);

const allowedOrigins = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes("*");
const allowCredentials = process.env.CORS_CREDENTIALS === "true";

function getAllowOrigin(originHeader?: string) {
  if (allowAllOrigins) return "*";
  if (originHeader && allowedOrigins.includes(originHeader)) return originHeader;
  return allowedOrigins[0] ?? "*";
}

const server = http.createServer((req, res) => {
  const originHeader = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const allowOrigin = getAllowOrigin(originHeader);
  const requestHeaders =
    typeof req.headers["access-control-request-headers"] === "string"
      ? req.headers["access-control-request-headers"]
      : "Content-Type, Authorization";

  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  res.setHeader("Access-Control-Max-Age", "86400");
  if (allowOrigin !== "*" && allowCredentials) {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

setupGameShowWS(server);

server.listen(PORT, () => {
  console.log(`[GameShow] WebSocket server running on ws://localhost:${PORT}/ws/gameshow`);
  testSupabaseConnection();
});
