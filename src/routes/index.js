const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patient.controller");
const authController = require("../controllers/auth.controller");
const encounterController = require("../controllers/encounter.controller");
const {
  supabaseAuth,
  requireRole,
  requirePermission,
} = require("../middleware/authMiddleware");

// Rute autentikasi (publik)
router.post("/auth/login", authController.loginStaff);
router.post("/auth/register", authController.registerStaff);
router.post("/auth/refresh-token", authController.refreshToken);
router.post("/auth/logout", authController.logout);

// Menerapkan autentikasi Supabase untuk semua rute di bawah baris ini
router.use(supabaseAuth);

// Rute pasien
router.post(
  "/patients",
  requireRole(["Admin", "Dokter", "Perawat"]),
  requirePermission("patients:create"),
  patientController.createPatient
);

router.get(
  "/patients",
  requirePermission("patients:read"),
  patientController.getAllPatients
);

router.get(
  "/patients/:id",
  requirePermission("patients:read"),
  patientController.getPatientById
);

router.put(
  "/patients/:id",
  requireRole(["Admin", "Dokter", "Perawat"]),
  requirePermission("patients:update"),
  patientController.updatePatient
);

router.delete(
  "/patients/:id",
  requireRole(["Admin"]),
  requirePermission("patients:delete"),
  patientController.deletePatient
);

// Rute encounter
router.post(
  "/encounters",
  requireRole(["Dokter", "Perawat"]),
  requirePermission("encounters:create"),
  encounterController.createEncounter
);

router.get(
  "/encounters/:id",
  requirePermission("encounters:read"),
  encounterController.getEncounterById
);

router.put(
  "/encounters/:id",
  requireRole(["Dokter", "Perawat"]),
  requirePermission("encounters:update"),
  encounterController.updateEncounter
);

module.exports = router;
