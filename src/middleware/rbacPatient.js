const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Dilarang, Anda tidak memiliki izin untuk melakukan aksi ini",
      });
    }
    next();
  };
};

module.exports = { authorizeRoles };
