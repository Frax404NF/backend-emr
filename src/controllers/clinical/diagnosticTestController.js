const diagnosticTestService = require("../../services/clinical/diagnosticTestService");
const { errorMessages } = require("../../utils/errorMessages");
const { successResponse, errorResponse } = require("../../utils/response");

// Configuration
const STATUS_FLOW = diagnosticTestService.getStatusFlowInfo();
const STATUS_TRANSITIONS = STATUS_FLOW.transitions;

// ==================== IMPROVED HELPER CLASSES ====================

class DiagnosticTestTransformer {
  static addMetadata(test) {
    const availableTransitions = STATUS_TRANSITIONS[test.status] || [];
    const metadata = { available_transitions: availableTransitions };

    // Add processing metrics for completed tests
    if (test.status === "COMPLETED" || test.status === "RESULT_VERIFIED") {
      const metrics = this.calculateProcessingMetrics(test);
      if (Object.keys(metrics).length > 0) {
        metadata.processing_metrics = metrics;
      }
    }

    // Add medical hash info for completed tests
    if (test.results_hash) {
      metadata.medical_hash_info = {
        hash_stored: true,
        hash_preview: test.results_hash.substring(0, 12) + "...",
        hash_type: "medical_data_only",
        blockchain_tx: !!test.results_tx_hash,
        status_excluded_from_hash: true,
      };
    }

    return { ...test, ...metadata };
  }

  static calculateProcessingMetrics(testData) {
    if (!testData.requested_at || !testData.completed_at) return {};

    const requestedAt = new Date(testData.requested_at);
    const completedAt = new Date(testData.completed_at);
    const processedAt = testData.processed_at
      ? new Date(testData.processed_at)
      : null;

    const metrics = {
      total_processing_minutes: Math.floor(
        (completedAt - requestedAt) / (1000 * 60)
      ),
    };

    if (processedAt) {
      metrics.request_to_process_minutes = Math.floor(
        (processedAt - requestedAt) / (1000 * 60)
      );
      metrics.process_to_complete_minutes = Math.floor(
        (completedAt - processedAt) / (1000 * 60)
      );
    }

    return metrics;
  }
}

class TimestampService {
  static addAutomaticTimestamps(updateData) {
    const now = new Date().toISOString();

    const timestampMap = {
      IN_PROGRESS: { field: "processed_at", timestamp: now },
      COMPLETED: { field: "completed_at", timestamp: now },
      RESULT_VERIFIED: { field: "verified_at", timestamp: now },
    };

    const timestampConfig = timestampMap[updateData.status];
    if (timestampConfig && !updateData[timestampConfig.field]) {
      updateData[timestampConfig.field] = timestampConfig.timestamp;
    }

    return updateData;
  }
}

// ✅ FIXED: Improved Error Handler
class ErrorHandler {
  static mapServiceError(error) {
    const errorMap = {
      "Invalid diagnostic test data": {
        status: 400,
        message:
          this.getErrorMessage("DIAGNOSTIC_TEST_INVALID") ||
          "Data diagnostic test tidak valid",
      },
      "Encounter tidak ditemukan": {
        status: this.getErrorCode("ENCOUNTER_NOT_FOUND") || 404,
        message:
          this.getErrorMessage("ENCOUNTER_NOT_FOUND") ||
          "Encounter tidak ditemukan",
      },
      "tidak aktif": {
        status: 400,
        message: "Encounter tidak dalam status aktif",
      },
      "Diagnostic test tidak ditemukan": {
        status: this.getErrorCode("DIAGNOSTIC_TEST_NOT_FOUND") || 404,
        message:
          this.getErrorMessage("DIAGNOSTIC_TEST_NOT_FOUND") ||
          "Diagnostic test tidak ditemukan",
      },
      "scheduleBlockchainStorage is not a function": {
        status: 500,
        message: "Internal service error - blockchain integration failed",
      },
      MedicalHashError: {
        status: 500,
        message:
          this.getErrorMessage("MEDICAL_HASH_GENERATION_FAILED") ||
          "Medical hash generation failed",
      },
      BlockchainIntegrationError: {
        status: 500,
        message:
          this.getErrorMessage("BLOCKCHAIN_STORAGE_FAILED") ||
          "Blockchain integration failed",
      },
      ValidationError: {
        status: 400,
        message: error.message,
      },
      NotFoundError: {
        status: 404,
        message: error.message,
      },
    };

    // Check for specific error patterns
    for (const [key, config] of Object.entries(errorMap)) {
      if (error.message.includes(key)) {
        return config;
      }
    }

    // Check error name/type
    if (error.name && errorMap[error.name]) {
      return errorMap[error.name];
    }

    // Default fallback
    return {
      status: 500,
      message:
        this.getErrorMessage("SERVER_ERROR") || "Terjadi kesalahan server",
    };
  }

  // ✅ Helper methods for error message extraction
  static getErrorMessage(errorKey) {
    const error = errorMessages[errorKey];
    if (typeof error === "string") {
      return error;
    }
    if (error && error.message) {
      return error.message;
    }
    return null;
  }

  static getErrorCode(errorKey) {
    const error = errorMessages[errorKey];
    if (error && error.code) {
      return error.code;
    }
    return null;
  }
}

// ✅ IMPROVED: Base controller class with better error handling
class BaseController {
  static async handleRequest(req, res, operation) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      // Enhanced error logging
      console.error(
        `[DIAGNOSTIC_TEST_CONTROLLER] Error in ${
          operation.name || "unknown operation"
        }:`,
        {
          message: error.message,
          name: error.name,
          code: error.code,
          stack: error.stack?.split("\n").slice(0, 3).join("\n"), // First 3 lines of stack
          timestamp: new Date().toISOString(),
        }
      );

      const { status, message } = ErrorHandler.mapServiceError(error);
      return errorResponse(res, message, status, {
        error_type: error.name || "UnknownError",
        error_code: error.code || "UNKNOWN_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  static extractRequestData(req) {
    return {
      id: req.params.id,
      encounterId: req.params.encounterId,
      staffId: req.user.staff_id,
      body: req.body,
      user: req.user,
      params: req.params,
      query: req.query,
    };
  }

  static validateId(id, fieldName = "ID") {
    if (!id || isNaN(parseInt(id)) || parseInt(id) <= 0) {
      throw new Error(`Invalid ${fieldName}: ${id}`);
    }
    return parseInt(id);
  }
}

// ==================== MAIN CONTROLLER ====================

class DiagnosticTestController extends BaseController {
  static async create(req, res) {
    return this.handleRequest(req, res, async () => {
      const {
        encounterId,
        body: testData,
        staffId,
      } = this.extractRequestData(req);

      // Validate required fields
      if (!testData.test_type || !testData.test_name) {
        throw new Error("Test type and test name are required");
      }

      // Validate encounter ID
      const validEncounterId = this.validateId(encounterId, "encounter ID");

      const newTest = await diagnosticTestService.createDiagnosticTest(
        validEncounterId,
        testData,
        staffId
      );

      const transformedTest = DiagnosticTestTransformer.addMetadata(newTest);
      return successResponse(
        res,
        transformedTest,
        "Diagnostic test berhasil dicatat",
        201
      );
    });
  }

  static async update(req, res) {
    return this.handleRequest(req, res, async () => {
      const { id, body: updateData, staffId } = this.extractRequestData(req);

      // Validate test ID
      const validTestId = this.validateId(id, "diagnostic test ID");

      // Validate update data
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error("Update data is required");
      }

      // Add automatic timestamps
      const dataWithTimestamps = TimestampService.addAutomaticTimestamps({
        ...updateData,
      });

      const updatedTest = await diagnosticTestService.updateDiagnosticTest(
        validTestId,
        dataWithTimestamps,
        staffId
      );

      const transformedTest =
        DiagnosticTestTransformer.addMetadata(updatedTest);
      return successResponse(
        res,
        transformedTest,
        "Diagnostic test berhasil diupdate"
      );
    });
  }

  static async getByEncounter(req, res) {
    return this.handleRequest(req, res, async () => {
      const { encounterId, query } = this.extractRequestData(req);

      // Validate encounter ID
      const validEncounterId = this.validateId(encounterId, "encounter ID");

      // Extract filters from query parameters
      const filters = {};
      if (query.status) filters.status = query.status;
      if (query.test_type) filters.test_type = query.test_type;

      const tests = await diagnosticTestService.getDiagnosticTestsByEncounter(
        validEncounterId,
        filters
      );

      const transformedTests = tests.map((test) =>
        DiagnosticTestTransformer.addMetadata(test)
      );

      return successResponse(
        res,
        {
          encounter_id: validEncounterId,
          total_tests: transformedTests.length,
          tests: transformedTests,
          filters_applied: filters,
        },
        "Data diagnostic test berhasil diambil"
      );
    });
  }

  static async getById(req, res) {
    return this.handleRequest(req, res, async () => {
      const { id } = this.extractRequestData(req);

      // Validate test ID
      const validTestId = this.validateId(id, "diagnostic test ID");

      const test = await diagnosticTestService.getDiagnosticTestById(
        validTestId
      );

      if (!test) {
        throw new Error("Diagnostic test tidak ditemukan");
      }

      const transformedTest = DiagnosticTestTransformer.addMetadata(test);
      return successResponse(
        res,
        transformedTest,
        "Detail diagnostic test berhasil diambil"
      );
    });
  }

  // ✅ NEW: Medical hash verification endpoint
  static async verifyMedicalHash(req, res) {
    return this.handleRequest(req, res, async () => {
      const { id } = this.extractRequestData(req);

      // Validate test ID
      const validTestId = this.validateId(id, "diagnostic test ID");

      const verification =
        await diagnosticTestService.verifyMedicalDataIntegrity(validTestId);

      return successResponse(
        res,
        {
          test_id: validTestId,
          verification_result: verification,
          verification_type: "medical_data_only",
          timestamp: new Date().toISOString(),
        },
        "Medical hash verification completed"
      );
    });
  }

  // ✅ NEW: Get verification report endpoint
  static async getVerificationReport(req, res) {
    return this.handleRequest(req, res, async () => {
      const { id } = this.extractRequestData(req);

      // Validate test ID
      const validTestId = this.validateId(id, "diagnostic test ID");

      const report = await diagnosticTestService.getVerificationReport(
        validTestId
      );

      return successResponse(
        res,
        report,
        "Verification report generated successfully"
      );
    });
  }

  // ✅ NEW: Get all tests with filters and pagination
  static async getAllTests(req, res) {
    return this.handleRequest(req, res, async () => {
      const { query } = this.extractRequestData(req);

      // Extract filters
      const filters = {};
      if (query.status) filters.status = query.status;
      if (query.test_type) filters.test_type = query.test_type;
      if (query.encounter_id) {
        filters.encounter_id = this.validateId(
          query.encounter_id,
          "encounter ID"
        );
      }
      if (query.requested_by) {
        filters.requested_by = this.validateId(query.requested_by, "staff ID");
      }
      if (query.date_from) filters.date_from = query.date_from;
      if (query.date_to) filters.date_to = query.date_to;

      // Extract pagination
      const pagination = {
        page: parseInt(query.page) || 1,
        limit: Math.min(parseInt(query.limit) || 50, 100), // Max 100 items per page
      };

      const result = await diagnosticTestService.getAllTests(
        filters,
        pagination
      );

      // Transform tests
      const transformedTests = result.data.map((test) =>
        DiagnosticTestTransformer.addMetadata(test)
      );

      return successResponse(
        res,
        {
          ...result,
          data: transformedTests,
          filters_applied: filters,
        },
        "Tests retrieved successfully"
      );
    });
  }
}

// ==================== EXPORTS ====================

// Export individual functions for backward compatibility
module.exports = {
  createDiagnosticTest: DiagnosticTestController.create.bind(DiagnosticTestController),
  updateDiagnosticTest: DiagnosticTestController.update.bind(DiagnosticTestController),
  getDiagnosticTestsByEncounter: DiagnosticTestController.getByEncounter.bind(DiagnosticTestController),
  getDiagnosticTestById: DiagnosticTestController.getById.bind(DiagnosticTestController),

  // ✅ NEW: Medical hash related endpoints
  verifyMedicalHash: DiagnosticTestController.verifyMedicalHash.bind(DiagnosticTestController),
  getVerificationReport: DiagnosticTestController.getVerificationReport.bind(DiagnosticTestController),
  getAllTests: DiagnosticTestController.getAllTests.bind(DiagnosticTestController),

  // Export classes for advanced usage and testing
  DiagnosticTestController,
  DiagnosticTestTransformer,
  TimestampService,
  ErrorHandler,
};
