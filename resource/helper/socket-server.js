const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

async function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  // Setup Redis Clients
  const pubClient = createClient({ url: "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    // Kita simpan pubClient ke global agar bisa dipakai buat CACHING di controller
    global.redisClient = pubClient;
    console.log("✅ Redis Adapter connected");
  } catch (err) {
    console.error("❌ Redis Adapter Error:", err);
  }

  global.io = io;

  io.on("connection", (socket) => {
    console.log("✅ SOCKET CONNECTED: " + socket.id);

    socket.on("updateData", (data) => {
      console.log("📩 updateData dari FE:", data);
      io.emit("refreshData", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ SOCKET DISCONNECTED: " + socket.id);
    });
  });
}

module.exports = initSocket;
