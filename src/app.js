require('dotenv').config();
const express = require('express');
const app = express();
const router = require('./routes');

app.use(express.json());

// API Routes
app.use('/api', router);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Basic route
app.get('/', (req, res) => {
  res.send('EMR API Server is running');
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});