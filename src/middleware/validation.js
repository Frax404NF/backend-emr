const validateSignUp = (req, res, next) => {
  const { email, password, staff_name, role, specialization } = req.body;
  const validRoles = ["DOCTOR", "NURSE", "ADMIN"];

  if (role === "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Pendaftaran admin hanya melalui proses inisialisasi sistem",
    });
  }

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

const validatePhoneNumber = (phone) => {
  // Format Indonesia: +62, 62, atau 08
  const regex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return regex.test(phone);
};

const validatePatientCreation = (req, res, next) => {
  const { patient_name, NIK, date_of_birth, gender, phone_number, emergency_contact_phonenumber } = req.body;

  // Validasi field wajib
  if (!patient_name || !NIK || !date_of_birth || !gender) {
    return res.status(400).json({
      success: false,
      message: "Patient name, NIK, date of birth, and gender are required",
    });
  }

  // validasi nomor telepon
  if (phone_number && !validatePhoneNumber(phone_number)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon tidak valid. Gunakan format Indonesia (contoh: 081234567890)"
    });
  }

  if (emergency_contact_phonenumber && !validatePhoneNumber(emergency_contact_phonenumber)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon darurat tidak valid"
    });
  }

  // Validasi NIK (16 digit angka)
  if (!/^\d{16}$/.test(NIK)) {
    return res.status(400).json({
      success: false,
      message: "NIK must be 16 digits",
    });
  }

  // Validasi tanggal format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    return res.status(400).json({
      success: false,
      message: "Invalid date format (YYYY-MM-DD)",
    });
  }

  // Validasi gender
  const validGenders = ["LAKI_LAKI", "PEREMPUAN"];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({
      success: false,
      message: "Invalid gender",
    });
  }

  next();
};

// Validasi update pasien
const validatePatientUpdate = (req, res, next) => {
  const updateData = req.body;

  if (updateData.NIK) {
    return res.status(400).json({
      success: false,
      message: "NIK cannot be updated",
    });
  }

  if (updateData.gender) {
    const validGenders = ["LAKI_LAKI", "PEREMPUAN"];
    if (!validGenders.includes(updateData.gender)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender",
      });
    }
  }

  // Validasi nomor telepon
  if (updateData.phone_number && !validatePhoneNumber(updateData.phone_number)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon tidak valid"
    });
  }

  if (updateData.emergency_contact_phonenumber && !validatePhoneNumber(updateData.emergency_contact_phonenumber)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon darurat tidak valid"
    });
  }

  next();
};

module.exports = {
  validateSignUp,
  validateSignIn,
  validatePatientCreation,
  validatePatientUpdate,
};
