require("dotenv").config();
const express = require("express");
const app = express();
const router = require("./routes");
const cors = require('cors');

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api", router);

// Basic route
app.get('/', (req, res) => {
  res.send('EMR API Server is running');
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
app.listen(PORT, () => {
  console.log(`EMR API berjalan di port ${PORT}`);
  console.log(`Mode: ${process.env.NODE_ENV || "development"}`);
  console.log(`API URL: http://localhost:${PORT}`);
});
