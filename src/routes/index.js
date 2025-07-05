const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const patientController = require("../controllers/patientController");
const {
  validateSignUp,
  validateSignIn,
  validatePatientCreation,
  validatePatientUpdate,
} = require("../middleware/validation");
const { authenticate } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/rbacPatient");

// ===================== Auth Routes =====================
router.post("/auth/register", validateSignUp, authController.signUp);
router.post("/auth/login", validateSignIn, authController.signIn);
router.post("/auth/signout", authenticate, authController.signOut);
router.get("/auth/profile", authenticate, authController.getProfile);

// ===================== Patient Routes =====================
// Create patient
router.post("/patients", authenticate, authorizeRoles(["DOCTOR", "NURSE"]), validatePatientCreation, patientController.createPatient);
// Get all patients
router.get("/patients", authenticate, patientController.getAllPatients);
// Get patient by ID
router.get("/patients/:patientId", authenticate, patientController.getPatientById);
// Update patient
router.put("/patients/:patientId", authenticate, authorizeRoles(["DOCTOR"]), validatePatientUpdate, patientController.updatePatient);
// Search patients
router.get("/patients/search", authenticate, patientController.searchPatients);
// Soft delete patient
router.delete("/patients/:patientId", authenticate, authorizeRoles(["DOCTOR"]), patientController.deletePatient);

module.exports = router;
