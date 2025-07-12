/**
 * Middleware validasi untuk pendaftaran staff medis baru
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

/**
 * Middleware validasi untuk login staff medis
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

/**
 * Validasi format nomor telepon Indonesia
 * Format yang valid: +62812345xxxx, 62812345xxxx, atau 0812345xxxx
 * Maksimal 15 karakter sesuai konstrain VARCHAR(15) di database
 * @param {string} phone - Nomor telepon yang akan divalidasi
 * @returns {boolean} - True jika format valid, false jika tidak
 */
const validatePhoneNumber = (phone) => {
  // Format Indonesia: +62, 62, atau 08
  // Maximum 15 characters to fit VARCHAR(15) database constraint
  if (phone.length > 15) return false;
  const regex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return regex.test(phone);
};

/**
 * Middleware validasi untuk pembuatan pasien reguler
 * Memvalidasi semua field yang diperlukan: nama, NIK, tanggal lahir, dan jenis kelamin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validatePatientCreation = (req, res, next) => {
  const {
    patient_name,
    NIK,
    date_of_birth,
    gender,
    phone_number,
    emergency_contact_phonenumber,
  } = req.body;

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
      message:
        "Format nomor telepon tidak valid. Gunakan format Indonesia (contoh: 081234567890)",
    });
  }

  if (
    emergency_contact_phonenumber &&
    !validatePhoneNumber(emergency_contact_phonenumber)
  ) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon darurat tidak valid",
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

  // Validasi blood type (optional field)
  if (req.body.blood_type) {
    const validBloodTypes = ["A", "B", "AB", "O"];
    if (!validBloodTypes.includes(req.body.blood_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood type. Valid options: A, B, AB, O",
      });
    }
  }

  next();
};

/**
 * Middleware validasi untuk pembaruan data pasien
 * NIK tidak bisa diubah setelah pembuatan
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
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

  // Validasi blood type (optional field)
  if (updateData.blood_type) {
    const validBloodTypes = ["A", "B", "AB", "O"];
    if (!validBloodTypes.includes(updateData.blood_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood type. Valid options: A, B, AB, O",
      });
    }
  }

  // Validasi nomor telepon
  if (
    updateData.phone_number &&
    !validatePhoneNumber(updateData.phone_number)
  ) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon tidak valid",
    });
  }

  if (
    updateData.emergency_contact_phonenumber &&
    !validatePhoneNumber(updateData.emergency_contact_phonenumber)
  ) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon darurat tidak valid",
    });
  }

  next();
};

/**
 * Middleware validasi untuk pembuatan catatan kunjungan pasien (encounter)
 * Memvalidasi patient_id, chief_complaint, triage_level, dan initial_vitals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateEncounterCreation = (req, res, next) => {
  const { patient_id, chief_complaint, triage_level, initial_vitals } =
    req.body;

  if (!patient_id || !chief_complaint || !triage_level || !initial_vitals) {
    return res.status(400).json({
      success: false,
      message: "Semua field wajib diisi",
    });
  }

  const requiredVitals = [
    "systolic",
    "diastolic",
    "heart_rate",
    "respiratory_rate",
    "temperature",
  ];
  for (const field of requiredVitals) {
    if (initial_vitals[field] === undefined || initial_vitals[field] === null) {
      return res.status(400).json({
        success: false,
        message: `Vital sign ${field} wajib diisi`,
      });
    }
  }

  next();
};

/**
 * Middleware validasi untuk pembaruan status encounter
 * Status yang valid: ONGOING, OBSERVATION, DISPOSITION, DISCHARGED, ADMITTED
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateStatusUpdate = (req, res, next) => {
  const validStatuses = [
    "ONGOING",
    "OBSERVATION",
    "DISPOSITION",
    "DISCHARGED",
    "ADMITTED",
  ];

  if(!req.params.encounterId.match(/^\d+$/)) {
    return errorResponse(res, "Invalid encounter ID", 400);
  }

  if (!validStatuses.includes(req.body.newStatus)) {
    return res.status(400).json({
      success: false,
      message: "Status tidak valid",
    });
  }
  next();
};

/**
 * Middleware validasi untuk pembuatan pasien darurat (emergency)
 * Hanya membutuhkan nama pasien dan jenis kelamin
 * Untuk tanggal lahir (date_of_birth):
 * - Jika disediakan, harus dalam format valid (YYYY-MM-DD)
 * - Jika tidak disediakan, akan menggunakan tanggal hari ini di service layer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateEmergencyPatientCreation = (req, res, next) => {
  const {
    patient_name,
    gender,
    phone_number,
    emergency_contact_phonenumber,
    is_emergency = false,
  } = req.body;

  // Check if this is an emergency registration
  if (!is_emergency) {
    // If not emergency, use regular validation
    return validatePatientCreation(req, res, next);
  }

  // Emergency patient validation - minimal required fields
  if (!patient_name || !gender) {
    return res.status(400).json({
      success: false,
      message: "Patient name and gender are required for emergency registration",
    });
  }

  // Validate gender for emergency patients
  const validGenders = ["LAKI_LAKI", "PEREMPUAN"];
  if (!validGenders.includes(gender)) {
    return res.status(400).json({
      success: false,
      message: "Invalid gender. Valid values: LAKI_LAKI, PEREMPUAN",
    });
  }

  // Note: date_of_birth is optional for emergency patients
  // If provided, validate format
  if (req.body.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.date_of_birth)) {
    return res.status(400).json({
      success: false,
      message: "Invalid date format (YYYY-MM-DD)",
    });
  }

  // For emergency patients, validate phone numbers if provided
  if (phone_number && !validatePhoneNumber(phone_number)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon tidak valid. Gunakan format Indonesia (contoh: 081234567890)",
    });
  }

  if (emergency_contact_phonenumber && !validatePhoneNumber(emergency_contact_phonenumber)) {
    return res.status(400).json({
      success: false,
      message: "Format nomor telepon darurat tidak valid",
    });
  }

  // Validate blood type if provided
  if (req.body.blood_type) {
    const validBloodTypes = ["A", "B", "AB", "O", "UNKNOWN"];
    if (!validBloodTypes.includes(req.body.blood_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blood type. Valid options: A, B, AB, O",
      });
    }
  }

  next();
};

/**
 * Modul middleware validasi untuk EMR API
 * @module middleware/validation
 * @exports {Object} Kumpulan middleware validasi untuk berbagai endpoint API
 */
module.exports = {
  validateSignUp,
  validateSignIn,
  validatePatientCreation,
  validatePatientUpdate,
  validateEncounterCreation,
  validateStatusUpdate,
  validateEmergencyPatientCreation,
};
