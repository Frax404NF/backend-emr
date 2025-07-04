const authService = require("../services/authService");
const { successResponse, errorResponse } = require("../utils/response");

const signUp = async (req, res) => {
  try {
    const staff = await authService.signUp(req.body);
    successResponse(res, staff, "Staff created successfully", 201);
  } catch (error) {
    const status = error.message.includes("already registered")
      ? 409
      : error.message.includes("Invalid")
      ? 400
      : 500;
    errorResponse(res, error.message, status);
  }
};

const signIn = async (req, res) => {
  try {
    const result = await authService.signIn(req.body);
    successResponse(res, result);
  } catch (error) {
    errorResponse(res, "Failed to sign in", 401);
  }
};

const signOut = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const result = await authService.signOut(token);
    successResponse(res, result, "Signed out successfully");
  } catch (error) {
    errorResponse(res, "Failed to sign out", 500);
  }
};

const getProfile = async (req, res) => {
  try {
    const staff = await authService.getStaffProfile(req.user.id);
    successResponse(res, staff);
  } catch (error) {
    errorResponse(res, "Failed to fetch profile", 500);
  }
};

module.exports = {
  signUp,
  signIn,
  signOut,
  getProfile,
};
