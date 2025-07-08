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

const doctorOnly = authorizeRoles(['DOCTOR']);

// Middleware khusus untuk perawat
const nurseOnly = authorizeRoles(['NURSE']);

// Middleware untuk staf klinis
const clinicalStaff = authorizeRoles(['DOCTOR', 'NURSE']);

module.exports = {
  authorizeRoles,
  doctorOnly,
  nurseOnly,
  clinicalStaff
};