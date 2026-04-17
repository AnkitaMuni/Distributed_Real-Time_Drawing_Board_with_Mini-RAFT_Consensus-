/**
 * Gateway Service
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors"); // Added CORS support

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.GATEWAY_PORT || "3000");
const REPLICAS = (process.env.REPLICAS || "").split(",").filter(Boolean);

const LEADER_POLL_INTERVAL = 500;  
const LEADER_TIMEOUT = 300;         

// ─── State ────────────────────────────────────────────────────────────────────
let currentLeader = null;           
const clients = new Set();          

// ─── Express + HTTP + WS setup ────────────────────────────────────────────────
const app = express();
app.use(cors()); // Enable CORS so the browser doesn't block /cluster calls
app.use(bodyParser.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function logInfo(msg) {
  console.log(`[Gateway] ${msg}`);
}

// ─── Leader Discovery ─────────────────────────────────────────────────────────
async function discoverLeader() {
  for (const replicaUrl of REPLICAS) {
    try {
      const res = await axios.get(`${replicaUrl}/status`, {
        timeout: LEADER_TIMEOUT,
      });
      // Ensure we match "LEADER" or "leader"
      if (res.data.state?.toUpperCase() === "LEADER" || res.data.status?.toUpperCase() === "LEADER") {
        return replicaUrl;
      }
    } catch {
      /* replica unreachable */
    }
  }
  return null;
}

async function pollLeader() {
  const found = await discoverLeader();
  if (found && found !== currentLeader) {
    logInfo(`Leader changed → ${found}`);
    currentLeader = found;
  } else if (!found && currentLeader) {
    logInfo("No leader found — election in progress?");
    currentLeader = null;
  }
}

setInterval(pollLeader, LEADER_POLL_INTERVAL);
pollLeader(); 

// ─── Broadcast ───────────────────────────────────────────────────────────────
function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ─── Forward stroke ──────────────────────────────────────────────────────────
async function forwardStrokeToLeader(stroke, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (!currentLeader) {
      currentLeader = await discoverLeader();
    }
    if (!currentLeader) {
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }

    try {
      const res = await axios.post(
        `${currentLeader}/stroke`,
        { stroke },
        { timeout: 1000 }
      );
      if (res.data.ok) {
        broadcast({ type: "stroke", stroke });
        return;
      }
    } catch (err) {
      if (err.response?.status === 307) {
        const hint = err.response.data?.leaderId;
        currentLeader = REPLICAS.find((r) => r.includes(hint?.split(":")[0])) || null;
      } else {
        currentLeader = null;
      }
    }
  }
}

// ─── WebSocket Connection ─────────────────────────────────────────────────────
wss.on("connection", async (ws) => {
  clients.add(ws);
  logInfo(`Client connected (total: ${clients.size})`);

  try {
    const leader = currentLeader || (await discoverLeader());
    if (leader) {
      const res = await axios.get(`${leader}/log`, { timeout: 500 });
      const entries = res.data.entries || [];
      for (const entry of entries) {
        ws.send(JSON.stringify({ type: "stroke", stroke: entry.stroke }));
      }
    }
  } catch {
    logInfo("Could not fetch log for new client");
  }

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === "stroke") {
      await forwardStrokeToLeader(msg.stroke);
    }
  });

  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
});

// ─── REST Debug Endpoints ─────────────────────────────────────────────────────
app.get("/status", (req, res) => {
  res.json({ connectedClients: clients.size, currentLeader, replicas: REPLICAS });
});

app.get("/cluster", async (req, res) => {
  const results = await Promise.all(
    REPLICAS.map(async (r) => {
      try {
        const s = await axios.get(`${r}/status`, { timeout: 500 });
        return { url: r, ...s.data };
      } catch {
        return { url: r, state: "UNREACHABLE" };
      }
    })
  );
  res.json(results);
});

server.listen(PORT, () => {
  logInfo(`Gateway listening on port ${PORT}`);
});