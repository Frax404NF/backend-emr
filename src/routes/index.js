const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validateSignUp, validateSignIn } = require("../middleware/validation");
const { authenticate } = require("../middleware/authMiddleware");

// Auth endpoints
router.post("/auth/register", validateSignUp, authController.signUp);
router.post("/auth/login", validateSignIn, authController.signIn);
router.post("/auth/signout", authenticate, authController.signOut);

// Protected endpoints
router.get("/auth/profile", authenticate, authController.getProfile);

module.exports = router;
