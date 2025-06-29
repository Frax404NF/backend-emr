const supabase = require("../config/supabase");
const { prisma } = require("../config/prisma");
const { createError } = require("../utils/error");
const { checkPermission } = require("../utils/rbacPolicies");

// Middleware autentikasi menggunakan Supabase
const supabaseAuth = async (req, res, next) => {
  try {
    // 1. Ambil token dari header Authorization
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return next(createError(401, "Authentication token missing"));

    // 2. Verifikasi token dengan Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return next(createError(401, "Invalid token"));

    // 3. Cari data staff berdasarkan auth_user_id
    const staff = await prisma.medicStaff.findUnique({
      where: { auth_user_id: user.id },
    });

    if (!staff) return next(createError(404, "Staff not found"));

    // 4. Menyisipkan informasi user ke objek request
    req.user = {
      id: staff.staff_id,
      auth_id: user.id,
      role: staff.role,
      email: staff.staff_email,
      name: staff.staff_name,
    };

    next();
  } catch (error) {
    next(createError(500, "Authentication failed", error));
  }
};

// Middleware untuk membatasi akses berdasarkan peran (role)
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return next(createError(403, "Insufficient permissions"));
    }
    next();
  };
};

// Middleware untuk membatasi akses berdasarkan permission tertentu
const requirePermission = (permission) => {
  return (req, res, next) => {
    const hasPermission = checkPermission(req.user.role, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = {
  supabaseAuth,
  requireRole,
  requirePermission,
};
