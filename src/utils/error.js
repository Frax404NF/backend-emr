function createError(status, message, originalError = null) {
  const error = new Error(message);
  error.status = status;
  error.isOperational = true; 

  // Tambahkan kode error khusus JWT
  if (originalError) {
    error.originalError = originalError;

    // Mapping error JWT ke pesan khusus
    if (originalError.name === "JsonWebTokenError") {
      error.message = "Token tidak valid";
      error.status = 401;
    } else if (originalError.name === "TokenExpiredError") {
      error.message = "Token kadaluarsa";
      error.status = 401;
    }
  }

  // Tampilkan error asli di mode development
  if (process.env.NODE_ENV === "development" && originalError) {
    console.error(originalError);
  }

  return error;
}

// Middleware penanganan error
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  // Log error
  console.error(
    `[${new Date().toISOString()}] ${req.method} ${
      req.path
    } - ${status}: ${message}`
  );

  // Kirim respon error ke client
  res.status(status).json({
    status: "error",
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = {
  createError,
  errorHandler,
};
