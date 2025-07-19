const supabase = require("../../config/supabase");
const { errorMessages } = require("../../utils/errorMessages");
const { successResponse, errorResponse } = require("../../utils/response");
const diagnosticTestService = require("../../services/clinical/diagnosticTestService");


// Ambil status flow info dari service agar terpusat
const { getStatusFlowInfo } = diagnosticTestService;
const STATUS_FLOW = getStatusFlowInfo();
const STATUS_TRANSITIONS = STATUS_FLOW.transitions;

// Helper function to calculate processing metrics
const calculateProcessingMetrics = (testData) => {
  if (!testData.requested_at || !testData.completed_at) return {};
  const requestedAt = new Date(testData.requested_at);
  const processedAt = testData.processed_at ? new Date(testData.processed_at) : null;
  const completedAt = new Date(testData.completed_at);
  const metrics = {
    total_processing_minutes: Math.floor((completedAt - requestedAt) / (1000 * 60))
  };
  if (processedAt) {
    metrics.request_to_process_minutes = Math.floor((processedAt - requestedAt) / (1000 * 60));
    metrics.process_to_complete_minutes = Math.floor((completedAt - processedAt) / (1000 * 60));
  }
  return metrics;
};

// Update diagnostic test (PATCH)
exports.updateDiagnosticTest = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const staffId = req.user.staff_id;

    // Gunakan service layer untuk update dan hashing
    try {
      // Set waktu otomatis
      if (updateData.status === 'IN_PROGRESS' && !updateData.processed_at) {
        updateData.processed_at = new Date().toISOString();
      }
      if (updateData.status === 'COMPLETED' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      if (updateData.status === 'RESULT_VERIFIED' && !updateData.verified_at) {
        updateData.verified_at = new Date().toISOString();
      }

      // Update dan hash via service
      const updatedTest = await diagnosticTestService.updateDiagnosticTest(id, updateData, staffId);

      // Tambahkan available_transitions dan processing_metrics
      const availableTransitions = STATUS_TRANSITIONS[updatedTest.status] || [];
      let processingMetrics = {};
      if (updatedTest.status === 'COMPLETED' || updatedTest.status === 'RESULT_VERIFIED') {
        processingMetrics = calculateProcessingMetrics(updatedTest);
      }

      res.status(200).json({
        success: true,
        message: "Diagnostic test berhasil diupdate",
        data: {
          ...updatedTest,
          available_transitions: availableTransitions,
          ...(Object.keys(processingMetrics).length > 0 && { processing_metrics: processingMetrics })
        }
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
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

    // Transform data dengan available_transitions dan metrics
    const transformed = tests.map((dt) => {
      const availableTransitions = STATUS_TRANSITIONS[dt.status] || [];
      let processingMetrics = {};
      if (dt.status === 'COMPLETED' || dt.status === 'RESULT_VERIFIED') {
        processingMetrics = calculateProcessingMetrics(dt);
      }
      return {
        ...dt,
        available_transitions: availableTransitions,
        ...(Object.keys(processingMetrics).length > 0 && { processing_metrics: processingMetrics })
      };
    });

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

    // Tambahkan available_transitions dan metrics
    const availableTransitions = STATUS_TRANSITIONS[test.status] || [];
    let processingMetrics = {};
    if (test.status === 'COMPLETED' || test.status === 'RESULT_VERIFIED') {
      processingMetrics = calculateProcessingMetrics(test);
    }

    successResponse(res, {
      ...test,
      available_transitions: availableTransitions,
      ...(Object.keys(processingMetrics).length > 0 && { processing_metrics: processingMetrics })
    }, "Detail diagnostic test berhasil diambil");
  } catch (error) {
    errorResponse(
      res,
      errorMessages.SERVER_ERROR.message,
      errorMessages.SERVER_ERROR.code,
      error
    );
  }
};