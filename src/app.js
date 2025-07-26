require("dotenv").config();
const express = require("express");
const app = express();
const router = require("./routes");
const cors = require("cors");
const { initializeBlockchain } = require("./services/blockchain");

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api", router);

// Basic route
app.get("/", (req, res) => {
  res.send("EMR API Server is running");
});

// Blockchain status endpoint
app.get("/api/blockchain/status", async (req, res) => {
  try {
    const { getBlockchainService } = require("./services/blockchain");
    const service = getBlockchainService();
    const status = await service.checkConnection();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      data: { connected: false },
    });
  }
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("[ERROR]", new Date().toISOString(), err.stack);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error_id: req.id,
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("Starting EMR API Server...");

    // Initialize blockchain service (non-blocking)
    console.log("Initializing blockchain service...");
    const blockchainInitialized = await initializeBlockchain();

    if (blockchainInitialized) {
      console.log("Blockchain service initialized successfully");
    } else {
      console.warn(
        "Blockchain service initialization failed - running without blockchain integration"
      );
    }

    app.listen(PORT, () => {
      console.log(`EMR API berjalan di port ${PORT}`);
      console.log(`Mode: ${process.env.NODE_ENV || "development"}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(
        `Blockchain Status: http://localhost:${PORT}/api/blockchain/status`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
