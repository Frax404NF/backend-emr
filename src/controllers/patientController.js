const patientService = require("../services/patientService");
const { successResponse, errorResponse } = require("../utils/response");
const { errorMessages } = require("../utils/errorMessages");

const createPatient = async (req, res) => {
  try {
    const patientData = {
      ...req.body,
      created_by: req.user.staff_id,
      updated_by: req.user.staff_id,
    };

    const patient = await patientService.createPatient(patientData);

    // Format response
    const formattedResponse = {
      ...patient,
      created_by: patient.medic_staff_created,
    };
    delete formattedResponse.medic_staff_created;

    successResponse(res, formattedResponse, "Pasien berhasil didaftarkan", 201);
  } catch (error) {
    const status =
      error.message === errorMessages.NIK_EXISTS.message
        ? 409
        : error.message === errorMessages.INVALID_PHONE.message
        ? 400
        : 400;

    errorResponse(res, error.message, status);
  }
};

const getPatientById = async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const patient = await patientService.getPatientById(patientId);

    // Format response
    const formattedPatient = {
      ...patient,
      created_by: patient.medic_staff_created,
      updated_by: patient.medic_staff_updated,
    };
    delete formattedPatient.medic_staff_created;
    delete formattedPatient.medic_staff_updated;

    successResponse(res, formattedPatient);
  } catch (error) {
    const status =
      error.message === errorMessages.PATIENT_NOT_FOUND.message
        ? 404
        : error.message === errorMessages.PATIENT_DELETED.message
        ? 404
        : 500;

    errorResponse(res, error.message, status);
  }
};

const getAllPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await patientService.getAllPatients(page, limit);
    successResponse(res, result);
  } catch (error) {
    const status =
      error.message === errorMessages.INVALID_PAGE_LIMIT.message ? 400 : 500;

    errorResponse(res, error.message, status);
  }
};

const updatePatient = async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const updateData = {
      ...req.body,
      updated_by: req.user.staff_id,
    };

    const updatedPatient = await patientService.updatePatient(
      patientId,
      updateData
    );
    successResponse(res, updatedPatient, "Data pasien berhasil diperbarui");
  } catch (error) {
    const status =
      error.message === errorMessages.PATIENT_NOT_FOUND.message ? 404 : 400;

    errorResponse(res, error.message, status);
  }
};

const searchPatients = async (req, res) => {
  try {
    const searchTerm = req.query.search || "";
    const patients = await patientService.searchPatients(searchTerm);
    successResponse(res, { patients });
  } catch (error) {
    errorResponse(res, errorMessages.SERVER_ERROR.message, 500);
  }
};

const deletePatient = async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    await patientService.softDeletePatient(patientId, req.user.staff_id);
    successResponse(res, null, "Pasien berhasil diarsipkan");
  } catch (error) {
    errorResponse(res, errorMessages.SERVER_ERROR.message, 500);
  }
};

module.exports = {
  createPatient,
  getPatientById,
  getAllPatients,
  updatePatient,
  searchPatients,
  deletePatient,
};
