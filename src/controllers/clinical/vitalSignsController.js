// src/controllers/vitalSignsController.js
const vitalSignsService = require("../../services/clinical/vitalSignsService");
const { successResponse, errorResponse } = require("../../utils/response");
const { errorMessages } = require("../../utils/errorMessages");

exports.createVitalSign = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const vitalData = req.body;
    const staffId = req.user.staff_id;

    const newVitalSign = await vitalSignsService.createVitalSign(
      encounterId,
      vitalData,
      staffId
    );

    successResponse(res, newVitalSign, "Tanda vital berhasil dicatat", 201);
  } catch (error) {
    // Tangani error spesifik
    let status = 500;
    let message = error.message;

    if (error.message.includes("Invalid vital sign data")) {
      status = errorMessages.VITAL_SIGN_INVALID.code;
      message = errorMessages.VITAL_SIGN_INVALID.message;
    } else if (error.message.includes("Encounter tidak ditemukan")) {
      status = errorMessages.ENCOUNTER_NOT_FOUND.code;
      message = errorMessages.ENCOUNTER_NOT_FOUND.message;
    } else if (error.message.includes("tidak aktif")) {
      status = 400;
      message = "Encounter tidak dalam status aktif";
    }

    errorResponse(res, message, status);
  }
};

exports.getVitalSignsByEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const vitalSigns = await vitalSignsService.getVitalSignsByEncounter(
      encounterId
    );

    // Transform data untuk frontend
    const transformed = vitalSigns.map((vs) => ({
      id: vs.vital_sign_id,
      time: vs.measurement_time,
      data: vs.vital_sign_data,
      created_by: vs.created_by,
      medic_staff: vs.medic_staff // staff info jika tersedia
    }));

    successResponse(res, transformed, "Data tanda vital berhasil diambil");
  } catch (error) {
    if (error.message.includes("Encounter tidak ditemukan")) {
      errorResponse(
        res,
        errorMessages.ENCOUNTER_NOT_FOUND.message,
        errorMessages.ENCOUNTER_NOT_FOUND.code
      );
    } else {
      errorResponse(
        res,
        errorMessages.SERVER_ERROR.message,
        errorMessages.SERVER_ERROR.code
      );
    }
  }
};

exports.getVitalSignById = async (req, res) => {
  try {
    const { id } = req.params;
    const vitalSign = await vitalSignsService.getVitalSignById(id);

    if (!vitalSign) {
      return errorResponse(
        res,
        errorMessages.VITAL_SIGN_NOT_FOUND.message,
        errorMessages.VITAL_SIGN_NOT_FOUND.code
      );
    }

    successResponse(res, vitalSign, "Detail tanda vital berhasil diambil");
  } catch (error) {
    errorResponse(
      res,
      errorMessages.SERVER_ERROR.message,
      errorMessages.SERVER_ERROR.code,
      error
    );
  }
};
