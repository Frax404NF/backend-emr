const validateSignUp = (req, res, next) => {
  const { email, password, staff_name, role, specialization } = req.body;
  const validRoles = ["DOCTOR", "NURSE", "ADMIN"];

  // if (role === "ADMIN") {
  //   return res.status(403).json({
  //     success: false,
  //     message: "Pendaftaran admin hanya melalui proses inisialisasi sistem",
  //   });
  // }

  if (!email || !password || !staff_name || !role) {
    return res.status(400).json({
      success: false,
      message: "Email, password, staff_name, and role are required",
    });
  }

  // Validasi format email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Validasi password kuat
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message:
        "Password must be at least 8 characters with uppercase, lowercase, and number",
    });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid role. Valid roles: DOCTOR, NURSE",
    });
  }

  if (
    role === "DOCTOR" &&
    specialization !== undefined &&
    specialization !== null &&
    specialization !== ""
  ) {
    if (typeof specialization !== "string") {
      return res.status(400).json({
        success: false,
        message: "Specialization must be a string",
      });
    }
  }

  next();
};

const validateSignIn = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  next();
};

module.exports = { validateSignUp, validateSignIn };
