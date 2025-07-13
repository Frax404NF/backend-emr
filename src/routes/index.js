const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const patientController = require("../controllers/patientController");
const encounterController = require("../controllers/encounterController");
const vitalSignsController = require("../controllers/clinical/vitalSignsController");
const diagnosisController = require("../controllers/clinical/diagnosisController");
const treatmentController = require("../controllers/clinical/treatmentController");

const {
  validateSignUp,
  validateSignIn,
  validatePatientCreation,
  validatePatientUpdate,
  validateEncounterCreation,
  validateStatusUpdate,
  validateEmergencyPatientCreation,
} = require("../middleware/validation");
const { authenticate } = require("../middleware/authMiddleware");
const {
  authorizeRoles,
  doctorOnly,
  nurseOnly,
  clinicalStaff,
} = require("../middleware/rbac");

// ===================== Auth Routes =====================
router.post("/auth/register", validateSignUp, authController.signUp);
router.post("/auth/login", validateSignIn, authController.signIn);
router.post("/auth/signout", authenticate, authController.signOut);
router.get("/auth/profile", authenticate, authController.getProfile);

// ===================== Patient Routes =====================
// Create patient (regular or emergency)
router.post("/patients", authenticate, authorizeRoles(["DOCTOR", "NURSE"]), validateEmergencyPatientCreation, patientController.createPatient);
// Update emergency patient to regular patient
router.put("/patients/:patientId/emergency-to-regular", authenticate, authorizeRoles(["DOCTOR", "NURSE"]), validatePatientCreation, patientController.updateEmergencyPatientToRegular);
// Get all patients
router.get("/patients", authenticate, patientController.getAllPatients);
// Search patients (MUST come before :patientId route)
router.get("/patients/search", authenticate, patientController.searchPatients);
// Get patient by ID
router.get("/patients/:patientId", authenticate, patientController.getPatientById);
// Update patient
router.put("/patients/:patientId", authenticate, authorizeRoles(["DOCTOR"]), validatePatientUpdate, patientController.updatePatient);
// Soft delete patient
router.delete("/patients/:patientId", authenticate, authorizeRoles(["DOCTOR"]), patientController.deletePatient);

// Encounter routes
// Start a new patient encounter (clinical staff only).
router.post('/encounters', authenticate, clinicalStaff, validateEncounterCreation, encounterController.startEncounter);
// Update encounter status (clinical staff only).
router.put('/encounters/:encounterId/status', authenticate, clinicalStaff, validateStatusUpdate, encounterController.changeStatus);
// Get details of a specific encounter.
router.get('/encounters/:encounterId', authenticate, encounterController.getEncounterDetails);
 // List all active encounters.
router.get('/encounters', authenticate, clinicalStaff, encounterController.listActiveEncounters);


// ===================== Vital Signs Routes =====================
router.post('/encounters/:encounterId/vitals', authenticate, clinicalStaff, vitalSignsController.createVitalSign);
router.get('/encounters/:encounterId/vitals', authenticate, clinicalStaff, vitalSignsController.getVitalSignsByEncounter);
router.get('/vitals/:id', authenticate, clinicalStaff, vitalSignsController.getVitalSignById);

// ===================== Diagnosis Routes =====================
router.post( '/encounters/:encounterId/diagnoses',authenticate, authorizeRoles(["DOCTOR"]), diagnosisController.createDiagnosis);

router.get('/encounters/:encounterId/diagnoses', authenticate, clinicalStaff, diagnosisController.getDiagnosesByEncounter);

router.get('/icd10/search', authenticate, clinicalStaff, diagnosisController.searchICD10);

// ===================== Treatment Routes =====================
router.post('/encounters/:encounterId/treatments', authenticate, clinicalStaff, treatmentController.createTreatment);
router.get('/encounters/:encounterId/treatments', authenticate, clinicalStaff, treatmentController.getTreatmentsByEncounter);

module.exports = router;
