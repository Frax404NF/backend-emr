module.exports = {
  PATIENT_NOT_FOUND: {
    code: 404,
    message: "Pasien tidak ditemukan",
  },
  NIK_EXISTS: {
    code: 409,
    message: "NIK sudah terdaftar",
  },
  INVALID_PHONE: {
    code: 400,
    message: "Format nomor telepon tidak valid",
  },
  PATIENT_DELETED: {
    code: 404,
    message: "Pasien telah dihapus (soft delete)",
  },
  FORBIDDEN_ACTION: {
    code: 403,
    message: "Anda tidak memiliki izin untuk melakukan aksi ini",
  },
  SERVER_ERROR: {
    code: 500,
    message: "Terjadi kesalahan server",
  },
  INVALID_PAGE_LIMIT: {
    code: 400,
    message: "Parameter page atau limit tidak valid",
  },
  ENCOUNTER_NOT_FOUND: {
    code: 404,
    message: "Kunjungan tidak ditemukan"
  },
  INVALID_STATUS_TRANSITION: {
    code: 400,
    message: "Transisi status tidak valid"
  },
  INVALID_TRIAGE_LEVEL: {
    code: 400,
    message: "Level triase tidak valid"
  },
  ENCOUNTER_CREATION_FAILED: {
    code: 500,
    message: "Gagal membuat kunjungan baru"
  },
  STATUS_UPDATE_FAILED: {
    code: 500,
    message: "Gagal memperbarui status"
  },

  // Vital Signs Errors
  VITAL_SIGN_INVALID: {
    code: 400,
    message: "Data tanda vital tidak valid"
  },
  VITAL_SIGN_REQUIRED: {
    code: 400,
    message: "Data tanda vital diperlukan"
  },
  VITAL_SIGN_NOT_FOUND: {
    code: 404,
    message: "Catatan tanda vital tidak ditemukan"
  },

  // Diagnosis Errors
  DIAGNOSIS_NOT_FOUND: {
    code: 404,
    message: "Diagnosis tidak ditemukan",
  },
  INVALID_DIAGNOSIS_DATA: {
    code: 400,
    message: "Data diagnosis tidak valid",
  },

  // Treatment Errors
   TREATMENT_INVALID: {
    code: 400,
    message: "Data treatment tidak valid"
  },
  TREATMENT_NOT_FOUND: {
    code: 404,
    message: "Treatment tidak ditemukan"
  },

  // Diagnostic Test Errors
  DIAGNOSTIC_TEST_INVALID: {
    code: 400,
    message: "Data diagnostic test tidak valid"
  },
  DIAGNOSTIC_TEST_NOT_FOUND: {
    code: 404,
    message: "Diagnostic test tidak ditemukan"
  },
  DIAGNOSTIC_TEST_CREATION_FAILED: {
    code: 500,
    message: "Gagal membuat diagnostic test"
  },
  DIAGNOSTIC_TEST_UPDATE_FAILED: {
    code: 500,
    message: "Gagal memperbarui diagnostic test"
  },
  DIAGNOSTIC_TEST_STATUS_INVALID: {
    code: 400,
    message: "Status diagnostic test tidak valid"
  },
  DIAGNOSTIC_TEST_RESULT_REQUIRED: {
    code: 400,
    message: "Hasil diagnostic test diperlukan"
  },
  DIAGNOSTIC_TEST_RESULT_VERIFICATION_FAILED: {
    code: 500,
    message: "Gagal verifikasi hasil diagnostic test"
  },
};
