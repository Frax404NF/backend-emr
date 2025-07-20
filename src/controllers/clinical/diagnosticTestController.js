const diagnosticTestService = require("../../services/clinical/diagnosticTestService");
const { errorMessages } = require("../../utils/errorMessages");
const { successResponse, errorResponse } = require("../../utils/response");

// Configuration
const STATUS_FLOW = diagnosticTestService.getStatusFlowInfo();
const STATUS_TRANSITIONS = STATUS_FLOW.transitions;

// Helper classes
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

class ErrorHandler {
  static mapServiceError(error) {
    const errorMap = {
      "Invalid diagnostic test data": {
        status: errorMessages.DIAGNOSTIC_TEST_INVALID?.code || 400,
        message:
          errorMessages.DIAGNOSTIC_TEST_INVALID?.message || error.message,
      },
      "Encounter tidak ditemukan": {
        status: errorMessages.ENCOUNTER_NOT_FOUND.code,
        message: errorMessages.ENCOUNTER_NOT_FOUND.message,
      },
      "tidak aktif": {
        status: 400,
        message: "Encounter tidak dalam status aktif",
      },
      "Diagnostic test tidak ditemukan": {
        status: errorMessages.DIAGNOSTIC_TEST_NOT_FOUND?.code || 404,
        message:
          errorMessages.DIAGNOSTIC_TEST_NOT_FOUND?.message ||
          "Diagnostic test tidak ditemukan",
      },
    };

    for (const [key, config] of Object.entries(errorMap)) {
      if (error.message.includes(key)) {
        return config;
      }
    }

    return {
      status: 500,
      message: errorMessages.SERVER_ERROR.message,
    };
  }
}

// Base controller class for common functionality
class BaseController {
  static async handleRequest(req, res, operation) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      const { status, message } = ErrorHandler.mapServiceError(error);
      return errorResponse(res, message, status, error);
    }
  }

  static extractRequestData(req) {
    return {
      id: req.params.id,
      encounterId: req.params.encounterId,
      staffId: req.user.staff_id,
      body: req.body,
    };
  }
}

class DiagnosticTestController extends BaseController {
  static async create(req, res) {
    return this.handleRequest(req, res, async () => {
      const {
        encounterId,
        body: testData,
        staffId,
      } = this.extractRequestData(req);

      const newTest = await diagnosticTestService.createDiagnosticTest(
        encounterId,
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

      // Add automatic timestamps
      const dataWithTimestamps = TimestampService.addAutomaticTimestamps({
        ...updateData,
      });

      const updatedTest = await diagnosticTestService.updateDiagnosticTest(
        id,
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
      const { encounterId } = this.extractRequestData(req);

      const tests = await diagnosticTestService.getDiagnosticTestsByEncounter(
        encounterId
      );
      const transformedTests = tests.map((test) =>
        DiagnosticTestTransformer.addMetadata(test)
      );

      return successResponse(
        res,
        transformedTests,
        "Data diagnostic test berhasil diambil"
      );
    });
  }

  static async getById(req, res) {
    return this.handleRequest(req, res, async () => {
      const { id } = this.extractRequestData(req);

      const test = await diagnosticTestService.getDiagnosticTestById(id);

      if (!test) {
        const { status, message } = ErrorHandler.mapServiceError(
          new Error("Diagnostic test tidak ditemukan")
        );
        return errorResponse(res, message, status);
      }

      const transformedTest = DiagnosticTestTransformer.addMetadata(test);
      return successResponse(
        res,
        transformedTest,
        "Detail diagnostic test berhasil diambil"
      );
    });
  }
}

// Export individual functions for backward compatibility
module.exports = {
  createDiagnosticTest: DiagnosticTestController.create.bind(DiagnosticTestController),
  updateDiagnosticTest: DiagnosticTestController.update.bind(DiagnosticTestController),
  getDiagnosticTestsByEncounter: DiagnosticTestController.getByEncounter.bind(DiagnosticTestController),
  getDiagnosticTestById: DiagnosticTestController.getById.bind(DiagnosticTestController),

  // Export classes for advanced usage and testing
  DiagnosticTestController,
  DiagnosticTestTransformer,
  TimestampService,
  ErrorHandler,
};
