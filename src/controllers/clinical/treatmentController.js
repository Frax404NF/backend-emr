const treatmentService = require("../../services/clinical/treatmentService");
const { successResponse, errorResponse } = require("../../utils/response");
const { errorMessages } = require("../../utils/errorMessages");

exports.createTreatment = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const treatmentData = req.body;
    const staffId = req.user.staff_id;

    const newTreatment = await treatmentService.createTreatment(
      encounterId,
      treatmentData,
      staffId
    );

    successResponse(res, newTreatment, "Treatment berhasil dicatat", 201);
  } catch (error) {
    let status = 500;
    let message = error.message;

    if (error.message.includes("Invalid treatment data")) {
      status = errorMessages.TREATMENT_INVALID?.code || 400;
      message = errorMessages.TREATMENT_INVALID?.message || error.message;
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

exports.getTreatmentsByEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const treatments = await treatmentService.getTreatmentsByEncounter(encounterId);

    // Transform data untuk frontend
    const transformed = treatments.map((tr) => ({
      id: tr.treatment_id,
      type: tr.treatment_type,
      details: tr.treatments_details,
      administered_by: tr.administered_by,
      administered_at: tr.administered_at,
      medic_staff: tr.medic_staff
    }));

    successResponse(res, transformed, "Data treatment berhasil diambil");
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
