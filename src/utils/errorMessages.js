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
};
