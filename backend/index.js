const express = require('express');
const http = require('http');
const mysql = require('mysql2');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// ✅ Configure WebSocket with proper CORS & transport
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // React app origin
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});


// Handle socket connection
io.on("connection", (socket) => {
  console.log("🔌 A client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});


// ✅ Enable CORS for API routes
app.use(cors());

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456789", // Replace with your DB password
  database: "count"      // Replace with your DB name
});

// ✅ Test MySQL connection
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.stack);
    return;
  }
  console.log("✅ Connected to MySQL database.");
});

// ✅ REST API: Get latest 100 rows
app.get("/logs", (req, res) => {
  db.query("SELECT * FROM obj_log ORDER BY timestamp DESC LIMIT 100", (err, results) => {
    if (err) {
      console.error("❌ Failed to fetch logs:", err);
      return res.status(500).send(err);
    }
    res.json(results);
  });
});

// ✅ Real-time: Poll latest row every 2 seconds and emit if new
let lastSentId = null;

setInterval(() => {
  db.query("SELECT * FROM obj_log ORDER BY timestamp DESC LIMIT 1", (err, rows) => {
    if (!err && rows.length) {
      const latest = rows[0];
      console.log("🕒 Latest in DB:", latest);

      if (latest.id !== lastSentId) {
        lastSentId = latest.id;
        io.emit("new_log", latest);
        console.log("📤 Emitted new log:", latest);
      } else {
        console.log("⚠️ Duplicate row. No emit.");
      }
    } else if (err) {
      console.error("❌ Error querying latest log:", err);
    }
  });
}, 2000); // Poll every 2 seconds

// ✅ Start the backend server
server.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
