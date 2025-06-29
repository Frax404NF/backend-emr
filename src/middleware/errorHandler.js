function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error untuk debugging
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${status}: ${message}`);

  // Error pada mode development: sertakan stack trace
  const response = {
    status,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(status).json(response);
}

module.exports = errorHandler;
