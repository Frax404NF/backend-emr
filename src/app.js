const express = require("express");
const dotenv = require("dotenv");
const { connect } = require("./config/prisma");
const errorHandler = require("./middleware/errorHandler");
const cors = require("cors");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware untuk parsing JSON dan mengaktifkan CORS
app.use(express.json());
app.use(cors());

// Koneksi ke database
connect();

// Routing utama aplikasi
app.use("/api", require("./routes"));

// Endpoint untuk pengecekan status server (health check)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// Middleware untuk penanganan error
app.use(errorHandler);

// Menjalankan server pada port yang ditentukan
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Proses shutdown server secara aman (graceful shutdown)
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = app;
