const soapNotesService = require("../../services/clinical/soapNotesService");
const { successResponse, errorResponse } = require("../../utils/response");
const { errorMessages } = require("../../utils/errorMessages");

exports.createSoapNote = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const noteData = req.body;
    const staffId = req.user.staff_id;

    const newSoapNote = await soapNotesService.createSoapNote(
      encounterId,
      noteData,
      staffId
    );

    successResponse(res, newSoapNote, "SOAP Notes berhasil dicatat", 201);
  } catch (error) {
    let status = 500;
    let message = error.message;

    if (error.message.includes("Invalid SOAP Note data")) {
      status = errorMessages.SOAP_NOTE_INVALID?.code || 400;
      message = errorMessages.SOAP_NOTE_INVALID?.message || error.message;
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

exports.getSoapNotesByEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;
    let notes = await soapNotesService.getSoapNotesByEncounter(encounterId);
    if (!Array.isArray(notes)) {
      notes = [];
    }
    successResponse(res, notes, "Data SOAP Notes berhasil diambil");
  } catch (error) {
    if (error.message && error.message.includes("Encounter tidak ditemukan")) {
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