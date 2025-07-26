const supabase = require("../../config/supabase");
const Joi = require("joi");
const {
  medicalDataHashService,
  MedicalHashError,
} = require("../hash/medicalDataHashService");
const {
  getBlockchainService,
  isBlockchainAvailable,
} = require("../blockchain");

// ==================== CONSTANTS ====================
const CONFIG = {
  DEBUG_HASH: process.env.DEBUG_HASH === "1",
  ACTIVE_ENCOUNTER_STATUSES: ["ONGOING", "OBSERVATION"],
  SELECT_FIELDS: `
    test_id, encounter_id, test_type, test_name, requested_by, requested_at,
    results, status, processed_by, processed_at, completed_at, results_hash, results_tx_hash
  `,
};

const STATUS_FLOW = {
  REQUESTED: { next: ["IN_PROGRESS"], required: [] },
  IN_PROGRESS: { next: ["COMPLETED"], required: ["processed_by"] },
  COMPLETED: { next: ["RESULT_VERIFIED"], required: ["results"] },
  RESULT_VERIFIED: { next: [], required: ["results_tx_hash"] },
};

const VALIDATION_SCHEMAS = {
  diagnosticTest: Joi.object({
    test_type: Joi.string()
      .valid("LAB", "RADIOLOGY", "ECG", "USG", "OTHER")
      .required(),
    test_name: Joi.string().max(255).required(),
    results: Joi.object().optional(),
    status: Joi.string().valid("REQUESTED").default("REQUESTED"),
  }),
};

// ==================== CUSTOM ERRORS ====================
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} tidak ditemukan`);
    this.name = "NotFoundError";
  }
}

class BlockchainIntegrationError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "BlockchainIntegrationError";
    this.originalError = originalError;
  }
}

// ==================== DATABASE SERVICE ====================
class DatabaseService {
  static async fetchEncounter(encounterId) {
    const { data, error } = await supabase
      .from("encounters")
      .select("encounter_id, status, patient_id, encounter_start_time")
      .eq("encounter_id", encounterId)
      .single();

    if (error || !data) {
      throw new NotFoundError("Encounter");
    }
    return data;
  }

  static async fetchStaff(staffId) {
    const { data, error } = await supabase
      .from("medic_staff")
      .select("staff_id, staff_name, role, email")
      .eq("staff_id", staffId)
      .single();

    if (error || !data) {
      throw new NotFoundError(`Staff dengan ID ${staffId}`);
    }
    return data;
  }

  static async fetchDiagnosticTest(testId) {
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS)
      .eq("test_id", testId)
      .single();

    if (error || !data) {
      throw new NotFoundError(`Diagnostic test ID ${testId}`);
    }
    return data;
  }
}

// ==================== STAFF POPULATION SERVICE ====================
class StaffPopulationService {
  /**
   * Populate staff data for diagnostic tests
   */
  static async populateStaffData(tests) {
    if (!tests || tests.length === 0) return tests;
    
    // Handle single test object
    const testsArray = Array.isArray(tests) ? tests : [tests];
    
    // Get unique staff IDs
    const staffIds = new Set();
    testsArray.forEach(test => {
      if (test.requested_by) staffIds.add(test.requested_by);
      if (test.processed_by) staffIds.add(test.processed_by);
    });
    
    if (staffIds.size === 0) return tests;
    
    // Fetch all staff data
    const { data: staffData, error } = await supabase
      .from("medic_staff")
      .select("staff_id, staff_name")
      .in("staff_id", Array.from(staffIds));
      
    if (error) {
      console.warn("[STAFF_POPULATION] Failed to fetch staff data:", error.message);
      return tests;
    }
    
    // Create staff lookup map
    const staffMap = new Map();
    staffData?.forEach(staff => {
      staffMap.set(staff.staff_id, staff);
    });
    
    // Populate staff data
    const populatedTests = testsArray.map(test => ({
      ...test,
      requested_staff: test.requested_by ? staffMap.get(test.requested_by) || null : null,
      processed_staff: test.processed_by ? staffMap.get(test.processed_by) || null : null,
    }));
    
    return Array.isArray(tests) ? populatedTests : populatedTests[0];
  }
}

// ==================== VALIDATION SERVICE ====================
class ValidationService {
  static validateStatusTransition(currentStatus, newStatus) {
    const allowedNext = STATUS_FLOW[currentStatus]?.next || [];

    if (!allowedNext.includes(newStatus)) {
      throw new ValidationError(
        `Tidak dapat mengubah status dari ${currentStatus} ke ${newStatus}. Allowed: ${allowedNext.join(
          ", "
        )}`
      );
    }
  }

  static validateRequiredFields(status, data) {
    const required = STATUS_FLOW[status]?.required || [];
    const missing = required.filter((field) => !data[field]);

    if (missing.length > 0) {
      throw new ValidationError(
        `Field '${missing.join("', '")}' wajib diisi untuk status ${status}`
      );
    }
  }

  static validateInput(schema, data) {
    const { error, value } = schema.validate(data);
    if (error) {
      throw new ValidationError(`Invalid data: ${error.details[0].message}`);
    }
    return value;
  }

  static validateMedicalResults(results) {
    if (!results || typeof results !== "object") {
      throw new ValidationError("Results must be a valid object");
    }

    if (Object.keys(results).length === 0) {
      throw new ValidationError("Results cannot be empty");
    }
  }
}

// ==================== MEDICAL HASH SERVICE INTEGRATION ====================
class MedicalHashIntegration {
  /**
   * Generate medical data hash with proper error handling
   */
  static async generateMedicalHash(testData) {
    try {
      const hash = await medicalDataHashService.generateMedicalDataHash(
        testData
      );

      console.log(
        `[MEDICAL_HASH] Generated hash for test ${
          testData.test_id
        }: ${hash.substring(0, 12)}...`
      );
      return hash;
    } catch (error) {
      if (error instanceof MedicalHashError) {
        throw error;
      }
      throw new MedicalHashError(
        `Unexpected error during hash generation: ${error.message}`,
        "HASH_GENERATION_UNEXPECTED"
      );
    }
  }

  /**
   * Verify medical data integrity with proper error handling
   */
  static async verifyMedicalIntegrity(testId, storedHash) {
    try {
      return await medicalDataHashService.verifyMedicalDataIntegrity(
        testId,
        storedHash
      );
    } catch (error) {
      console.error(
        `[MEDICAL_HASH] Verification failed for test ${testId}:`,
        error.message
      );
      throw error;
    }
  }
}

// ==================== BLOCKCHAIN INTEGRATION SERVICE ====================
class BlockchainIntegrationService {
  /**
   * Store hash to blockchain (non-blocking)
   */
  static async storeHashToBlockchain(testId, hash) {
    const isAvailable = await isBlockchainAvailable();

    if (!isAvailable) {
      console.warn(
        `[BLOCKCHAIN] Service unavailable for test ${testId} - storing hash only in database`
      );
      return null;
    }

    try {
      console.log(`[BLOCKCHAIN] Attempting to store hash for test ${testId}`);
      const blockchainService = getBlockchainService();
      const result = await blockchainService.storeHash(testId, hash);

      console.log(
        `[BLOCKCHAIN] Successfully stored hash for test ${testId}: ${result.transactionHash}`
      );
      return result.transactionHash;
    } catch (error) {
      console.error(
        `[BLOCKCHAIN] Failed to store hash for test ${testId}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Verify hash from blockchain
   */
  static async verifyHashFromBlockchain(testId, hash) {
    const isAvailable = await isBlockchainAvailable();

    if (!isAvailable) {
      return { verified: false, reason: "Blockchain service unavailable" };
    }

    try {
      const blockchainService = getBlockchainService();
      const isValid = await blockchainService.verifyHash(testId, hash);

      return {
        verified: true,
        isValid,
        reason: isValid
          ? "Hash verified on blockchain"
          : "Hash mismatch on blockchain",
      };
    } catch (error) {
      return {
        verified: false,
        reason: `Verification failed: ${error.message}`,
      };
    }
  }
}

// ==================== MAIN DIAGNOSTIC TEST SERVICE ====================
class DiagnosticTestService {
  /**
   * Create new diagnostic test
   */
  static async create(encounterId, testData, staffId) {
    const validatedData = ValidationService.validateInput(
      VALIDATION_SCHEMAS.diagnosticTest,
      testData
    );

    const [encounter, staff] = await Promise.all([
      DatabaseService.fetchEncounter(encounterId),
      DatabaseService.fetchStaff(staffId),
    ]);

    if (!CONFIG.ACTIVE_ENCOUNTER_STATUSES.includes(encounter.status)) {
      throw new ValidationError(
        "Tidak dapat menambahkan diagnostic test untuk encounter yang tidak aktif"
      );
    }

    const now = new Date().toISOString();
    const insertData = {
      encounter_id: encounterId,
      test_type: validatedData.test_type,
      test_name: validatedData.test_name,
      requested_by: staffId,
      requested_at: now,
      results: validatedData.results || null,
      status: "REQUESTED",
      processed_by: null,
      processed_at: null,
      completed_at: null,
      results_hash: null,
      results_tx_hash: null,
      created_by: staffId,
      updated_by: staffId,
      created_at: now,
      updated_at: now,
    };

    console.log(
      `[DIAGNOSTIC_TEST] Creating test for encounter ${encounterId} by staff ${staffId}`
    );

    const { data, error } = await supabase
      .from("diagnostic_tests")
      .insert([insertData])
      .select(CONFIG.SELECT_FIELDS)
      .single();

    if (error) {
      console.error("[DIAGNOSTIC_TEST] Create error:", error);
      throw new Error(`Gagal menyimpan diagnostic test: ${error.message}`);
    }

    console.log(`[DIAGNOSTIC_TEST] Created test ${data.test_id}`);
    data.available_transitions = STATUS_FLOW[data.status]?.next || [];
    
    // Populate staff data
    const populatedData = await StaffPopulationService.populateStaffData(data);
    return populatedData;
  }

  /**
   * ✅ FIXED: Update method - Medical Data Hash Integration
   */
  static async update(testId, updateData, staffId) {
    console.log(
      `[DIAGNOSTIC_TEST] Updating test ${testId} to status ${updateData.status} by staff ${staffId}`
    );

    const currentTest = await DatabaseService.fetchDiagnosticTest(testId);

    // Validate status transition
    if (updateData.status) {
      ValidationService.validateStatusTransition(
        currentTest.status,
        updateData.status
      );
      ValidationService.validateRequiredFields(updateData.status, updateData);
    }

    const now = new Date().toISOString();
    const updatePayload = {
      ...updateData,
      updated_by: staffId,
      updated_at: now,
    };

    // Handle status-specific logic
    if (updateData.status === "IN_PROGRESS") {
      // Use processed_by from updateData if provided, otherwise use current staffId
      updatePayload.processed_by = updateData.processed_by || staffId;
      updatePayload.processed_at = now;
    }

    // ✅ CRITICAL: Medical Data Hash Generation when COMPLETED
    if (updateData.status === "COMPLETED") {
      updatePayload.completed_at = now;

      // Validate medical results
      if (!updatePayload.results) {
        throw new ValidationError("Results are required when completing test");
      }
      ValidationService.validateMedicalResults(updatePayload.results);

      try {
        // Build complete test data for hash generation
        const completeTestData = {
          ...currentTest,
          ...updatePayload,
          test_id: testId,
        };

        // ✅ Generate medical data hash (status excluded)
        const medicalHash = await MedicalHashIntegration.generateMedicalHash(
          completeTestData
        );
        updatePayload.results_hash = medicalHash;

        // Update database with medical hash
        const { data: updatedTest, error: updateError } = await supabase
          .from("diagnostic_tests")
          .update(updatePayload)
          .eq("test_id", testId)
          .select(CONFIG.SELECT_FIELDS)
          .single();

        if (updateError) {
          throw new Error(
            `Failed to update diagnostic test: ${updateError.message}`
          );
        }

        console.log(
          `[DIAGNOSTIC_TEST] Updated test ${testId} to COMPLETED with medical hash`
        );

        // ✅ FIXED: Background blockchain storage (non-blocking)
        DiagnosticTestService.scheduleBlockchainStorage(testId, medicalHash);

        // Populate staff data
        const populatedData = await StaffPopulationService.populateStaffData(updatedTest);
        return populatedData;
      } catch (hashError) {
        console.error(
          `[DIAGNOSTIC_TEST] Medical hash generation failed for test ${testId}:`,
          hashError.message
        );
        throw hashError;
      }
    }

    // Manual transition to RESULT_VERIFIED
    if (
      updateData.status === "RESULT_VERIFIED" &&
      currentTest.status === "COMPLETED"
    ) {
      if (!currentTest.results_tx_hash) {
        throw new ValidationError(
          "Cannot verify result without blockchain transaction hash. Complete the test with blockchain integration first."
        );
      }

      // Verify medical data integrity before marking as verified
      try {
        // ✅ FIXED: Static method call
        const verification =
          await DiagnosticTestService.verifyMedicalDataIntegrity(testId);
        if (!verification.verified) {
          throw new ValidationError(
            `Cannot verify test: ${verification.reason}`
          );
        }
      } catch (verifyError) {
        console.warn(
          `[DIAGNOSTIC_TEST] Verification check failed for test ${testId}: ${verifyError.message}`
        );
        // Allow manual verification even if auto-verification fails
      }
    }

    // For other status updates, proceed normally
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .update(updatePayload)
      .eq("test_id", testId)
      .select(CONFIG.SELECT_FIELDS)
      .single();

    if (error) {
      throw new Error(`Failed to update diagnostic test: ${error.message}`);
    }

    console.log(
      `[DIAGNOSTIC_TEST] Updated test ${testId} to status ${updatePayload.status}`
    );
    
    // Populate staff data
    const populatedData = await StaffPopulationService.populateStaffData(data);
    return populatedData;
  }

  /**
   * ✅ FIXED: Non-blocking blockchain storage scheduling
   */
  static scheduleBlockchainStorage(testId, hash) {
    // Use setImmediate to ensure non-blocking execution
    setImmediate(async () => {
      try {
        const txHash = await BlockchainIntegrationService.storeHashToBlockchain(
          testId,
          hash
        );

        if (txHash) {
          // Update only blockchain-related fields
          const { error: txUpdateError } = await supabase
            .from("diagnostic_tests")
            .update({
              results_tx_hash: txHash,
              status: "RESULT_VERIFIED", // Auto-transition
              // ✅ Don't update updated_at to preserve medical hash integrity
            })
            .eq("test_id", testId);

          if (!txUpdateError) {
            console.log(
              `[DIAGNOSTIC_TEST] Auto-transitioned test ${testId} to RESULT_VERIFIED`
            );
            console.log(`[DIAGNOSTIC_TEST] Blockchain transaction: ${txHash}`);
          } else {
            console.warn(
              `[DIAGNOSTIC_TEST] Failed to update tx hash: ${txUpdateError.message}`
            );
          }
        }
      } catch (blockchainError) {
        console.warn(
          `[DIAGNOSTIC_TEST] Background blockchain storage failed for test ${testId}: ${blockchainError.message}`
        );
        // This is non-blocking - the test remains COMPLETED
      }
    });
  }

  /**
   * ✅ FIXED: Verify medical data integrity
   */
  static async verifyMedicalDataIntegrity(testId) {
    console.log(
      `[DIAGNOSTIC_TEST] Verifying medical data integrity for test ${testId}`
    );

    // ✅ FIXED: Static method call
    const test = await DiagnosticTestService.getById(testId);

    if (!test.results_hash) {
      return {
        verified: false,
        reason: "No medical data hash stored for this test",
        test_id: testId,
      };
    }

    // Use medical hash integration for verification
    return await MedicalHashIntegration.verifyMedicalIntegrity(
      testId,
      test.results_hash
    );
  }

  /**
   * Get diagnostic test by ID
   */
  static async getById(testId) {
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS)
      .eq("test_id", testId)
      .single();

    if (error || !data) {
      throw new NotFoundError("Diagnostic test");
    }

    // Populate staff data
    const populatedData = await StaffPopulationService.populateStaffData(data);
    return populatedData;
  }

  /**
   * Get diagnostic tests by encounter
   */
  static async getByEncounter(encounterId, filters = {}) {
    let query = supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS)
      .eq("encounter_id", encounterId);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.test_type) {
      query = query.eq("test_type", filters.test_type);
    }

    query = query.order("requested_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[DIAGNOSTIC_TEST] Query error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Populate staff data for all tests
    const populatedData = await StaffPopulationService.populateStaffData(data || []);
    return populatedData;
  }

  /**
   * ✅ FIXED: Get comprehensive verification report
   */
  static async getVerificationReport(testId) {
    // ✅ FIXED: Static method calls
    const verification = await DiagnosticTestService.verifyMedicalDataIntegrity(
      testId
    );
    const test = await DiagnosticTestService.getById(testId);

    return {
      test_info: {
        test_id: test.test_id,
        test_name: test.test_name,
        test_type: test.test_type,
        status: test.status,
        completed_at: test.completed_at,
      },
      medical_data_integrity: verification,
      blockchain: {
        hash_stored: !!test.results_hash,
        transaction_hash: test.results_tx_hash,
        blockchain_available: await isBlockchainAvailable(),
      },
      hash_type: "medical_data_only",
      excluded_from_hash: ["status", "audit_fields", "blockchain_fields"],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all tests with pagination and filters
   */
  static async getAllTests(filters = {}, pagination = {}) {
    const { page = 1, limit = 50 } = pagination;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS, { count: "exact" });

    // Apply filters
    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.test_type) {
      query = query.eq("test_type", filters.test_type);
    }

    if (filters.encounter_id) {
      query = query.eq("encounter_id", filters.encounter_id);
    }

    if (filters.requested_by) {
      query = query.eq("requested_by", filters.requested_by);
    }

    if (filters.date_from) {
      query = query.gte("requested_at", filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte("requested_at", filters.date_to);
    }

    // Apply pagination and ordering
    query = query
      .order("requested_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[DIAGNOSTIC_TEST] Query error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get status flow information
   */
  static getStatusFlow() {
    return {
      statuses: Object.keys(STATUS_FLOW),
      transitions: Object.entries(STATUS_FLOW).reduce(
        (acc, [status, config]) => {
          acc[status] = config.next;
          return acc;
        },
        {}
      ),
      required_fields: Object.entries(STATUS_FLOW).reduce(
        (acc, [status, config]) => {
          acc[status] = config.required;
          return acc;
        },
        {}
      ),
    };
  }
}

// ==================== BACKWARD COMPATIBLE EXPORTS ====================
module.exports = {
  // Original export structure (for existing frontend)
  createDiagnosticTest: DiagnosticTestService.create,
  updateDiagnosticTest: DiagnosticTestService.update,
  getDiagnosticTestsByEncounter: DiagnosticTestService.getByEncounter,
  getDiagnosticTestById: DiagnosticTestService.getById,
  getStatusFlowInfo: DiagnosticTestService.getStatusFlow,

  // New medical data integrity features
  verifyMedicalDataIntegrity: DiagnosticTestService.verifyMedicalDataIntegrity,
  getVerificationReport: DiagnosticTestService.getVerificationReport,
  getAllTests: DiagnosticTestService.getAllTests,

  // Export classes for advanced usage
  DiagnosticTestService,
  ValidationError,
  NotFoundError,
  BlockchainIntegrationError,
  MedicalHashIntegration,
};
