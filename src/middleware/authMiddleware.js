const supabase = require("../config/supabase");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verifikasi token dengan Supabase
    const { data, error } = await supabase.auth.getUser(token);
    if (error) throw error;

    // Dapatkan data staff lengkap
    const { data: staff, error: staffError } = await supabase
      .from("medic_staff")
      .select("staff_id, staff_name, role, specialization, email")
      .eq("auth_uid", data.user.id)
      .single();

    if (staffError) throw staffError;

    // Simpan user info di request
    req.user = {
      id: data.user.id,
      ...staff,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    const statusCode = error.message.includes("token") ? 401 : 500;
    const message = error.message.includes("token")
      ? "Invalid or expired token"
      : "Authentication failed";

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = { authenticate };
