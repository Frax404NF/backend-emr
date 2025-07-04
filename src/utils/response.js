const successResponse = (res, data, message = "Success", status = 200) => {
  res.status(status).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = "Error", status = 400) => {
  res.status(status).json({
    success: false,
    message,
  });
};

module.exports = { successResponse, errorResponse };
