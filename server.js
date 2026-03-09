const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const root = __dirname;
const dbPath = process.env.ARC_DRIVE_DB_PATH || path.join(root, "data", "arc-drive.db");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_name TEXT NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 0),
    distance INTEGER NOT NULL CHECK(distance >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(score DESC, distance DESC, id DESC);
  CREATE INDEX IF NOT EXISTS idx_runs_distance ON runs(distance DESC, score DESC, id DESC);
`);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function getLeaderboardPayload() {
  return {
    topScore: db.prepare(`
      SELECT
        id,
        driver_name AS driverName,
        score,
        distance,
        created_at AS createdAt
      FROM runs
      ORDER BY score DESC, distance DESC, id ASC
      LIMIT 1
    `).get() || null,
    longestRun: db.prepare(`
      SELECT
        id,
        driver_name AS driverName,
        score,
        distance,
        created_at AS createdAt
      FROM runs
      ORDER BY distance DESC, score DESC, id ASC
      LIMIT 1
    `).get() || null,
    entries: db.prepare(`
      SELECT
        id,
        driver_name AS driverName,
        score,
        distance,
        created_at AS createdAt
      FROM runs
      ORDER BY score DESC, distance DESC, id ASC
      LIMIT 10
    `).all(),
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(request, response) {
  const rawPath = (request.url || "/").split("?")[0];
  const relativePath = rawPath === "/" ? "index.html" : decodeURIComponent(rawPath).replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  const extension = path.extname(filePath).toLowerCase();

  if (!filePath.startsWith(root)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  if (!contentTypes[extension]) {
    sendText(response, 404, "Not found");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendText(response, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, { "Content-Type": contentTypes[extension] });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const rawPath = (request.url || "/").split("?")[0];

  if (request.method === "GET" && rawPath === "/api/leaderboard") {
    sendJson(response, 200, getLeaderboardPayload());
    return;
  }

  if (request.method === "POST" && rawPath === "/api/runs") {
    try {
      const body = await readJsonBody(request);
      const driverName = String(body.driverName || "").trim().slice(0, 24);
      const score = Number.parseInt(body.score, 10);
      const distance = Number.parseInt(body.distance, 10);

      if (!driverName) {
        sendJson(response, 400, { error: "Driver name is required." });
        return;
      }

      if (!Number.isInteger(score) || score < 0 || !Number.isInteger(distance) || distance < 0) {
        sendJson(response, 400, { error: "Score and distance must be non-negative integers." });
        return;
      }

      const result = db.prepare(`
        INSERT INTO runs (driver_name, score, distance)
        VALUES (?, ?, ?)
      `).run(driverName, score, distance);
      const savedRun = db.prepare(`
        SELECT
          id,
          driver_name AS driverName,
          score,
          distance,
          created_at AS createdAt
        FROM runs
        WHERE id = ?
      `).get(Number(result.lastInsertRowid));
      sendJson(response, 201, {
        savedRun,
        leaderboard: getLeaderboardPayload(),
      });
      return;
    } catch (error) {
      sendJson(response, 400, { error: "Invalid JSON payload." });
      return;
    }
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Arc Drive available at http://${host}:${port}`);
});
