const encounterService = require("../services/encounterService");
const { successResponse, errorResponse } = require("../utils/response");

const startEncounter = async (req, res) => {
  try {
    const { patient_id, chief_complaint, triage_level, initial_vitals } =
      req.body;
    const staffId = req.user.staff_id;

    const encounter = await encounterService.createEncounter(
      patient_id,
      { chief_complaint, triage_level, initial_vitals },
      staffId
    );

    successResponse(res, encounter, "Kunjungan IGD dimulai", 201);
  } catch (error) {
    errorResponse(res, error.message, 400);
  }
};

const changeStatus = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { newStatus } = req.body;
    const staffId = req.user.staff_id;

    const updated = await encounterService.updateStatus(
      encounterId,
      newStatus,
      staffId
    );

    successResponse(res, updated, "Status kunjungan diperbarui");
  } catch (error) {
    errorResponse(res, error.message, 400);
  }
};

const getEncounterDetails = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const encounter = await encounterService.getFullEncounter(encounterId);
    successResponse(res, encounter);
  } catch (error) {
    errorResponse(res, error.message, 404);
  }
};

const listActiveEncounters = async (req, res) => {
  try {
    const { status } = req.query;
    const statusFilter = status ? status.split(",") : [];

    const encounters = await encounterService.getActiveEncounters(statusFilter);
    successResponse(res, encounters);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

module.exports = {
  startEncounter,
  changeStatus,
  getEncounterDetails,
  listActiveEncounters,
};
