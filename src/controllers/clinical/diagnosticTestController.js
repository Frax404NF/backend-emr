const supabase = require("../../config/supabase");
const { errorMessages } = require("../../utils/errorMessages");
const { successResponse, errorResponse } = require("../../utils/response");
const diagnosticTestService = require("../../services/clinical/diagnosticTestService");

// Update diagnostic test (PATCH)
exports.updateDiagnosticTest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const staffId = req.user.staff_id;

    const allowedStatus = [
      "REQUESTED",
      "REQUEST_VERIFIED",
      "IN_PROGRESS",
      "COMPLETED",
      "RESULT_VERIFIED"
    ];
    if (updateData.status && !allowedStatus.includes(updateData.status)) {
      return res.status(400).json({ success: false, message: "Status tidak valid" });
    }

    // Update di database
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .update({
        ...updateData,
        updated_by: staffId,
        updated_at: new Date().toISOString()
      })
      .eq("test_id", id)
      .select("*")
      .single();

    if (error) {
      throw new Error(`Gagal update diagnostic test: ${error.message}`);
    }
    res.status(200).json({
      success: true,
      message: "Diagnostic test berhasil diupdate",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.createDiagnosticTest = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const testData = req.body;
    const staffId = req.user.staff_id;

    const newTest = await diagnosticTestService.createDiagnosticTest(
      encounterId,
      testData,
      staffId
    );

    successResponse(res, newTest, "Diagnostic test berhasil dicatat", 201);
  } catch (error) {
    let status = 500;
    let message = error.message;

    if (error.message.includes("Invalid diagnostic test data")) {
      status = errorMessages.DIAGNOSTIC_TEST_INVALID?.code || 400;
      message = errorMessages.DIAGNOSTIC_TEST_INVALID?.message || error.message;
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

exports.getDiagnosticTestsByEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const tests = await diagnosticTestService.getDiagnosticTestsByEncounter(encounterId);

    // Transform data untuk frontend
    const transformed = tests.map((dt) => ({
      id: dt.test_id,
      type: dt.test_type,
      name: dt.test_name,
      requested_by: dt.requested_by,
      requested_at: dt.requested_at,
      results: dt.results,
      status: dt.status,
      processed_by: dt.processed_by,
      processed_at: dt.processed_at,
      completed_at: dt.completed_at,
      medic_staff: dt.medic_staff
    }));

    successResponse(res, transformed, "Data diagnostic test berhasil diambil");
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

exports.getDiagnosticTestById = async (req, res) => {
  try {
    const { id } = req.params;
    const test = await diagnosticTestService.getDiagnosticTestById(id);

    if (!test) {
      return errorResponse(
        res,
        errorMessages.DIAGNOSTIC_TEST_NOT_FOUND?.message || "Diagnostic test tidak ditemukan",
        errorMessages.DIAGNOSTIC_TEST_NOT_FOUND?.code || 404
      );
    }

    successResponse(res, test, "Detail diagnostic test berhasil diambil");
  } catch (error) {
    errorResponse(
      res,
      errorMessages.SERVER_ERROR.message,
      errorMessages.SERVER_ERROR.code,
      error
    );
  }
};