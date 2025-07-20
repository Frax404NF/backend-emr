const supabase = require("../../config/supabase");
const Joi = require("joi");
const crypto = require("crypto");

// Configuration
const CONFIG = {
  DEBUG_HASH: process.env.DEBUG_HASH === "1",
  ACTIVE_ENCOUNTER_STATUSES: ["ONGOING", "OBSERVATION"],
  SELECT_FIELDS: `
    test_id, encounter_id, test_type, test_name, requested_by, requested_at,
    results, status, processed_by, processed_at, completed_at,
    requested_staff:requested_by(staff_id, staff_name),
    processed_staff:processed_by(staff_id, staff_name)
  `,
};

const STATUS_FLOW = {
  REQUESTED: { next: ["IN_PROGRESS"], required: [] },
  IN_PROGRESS: { next: ["COMPLETED"], required: ["processed_by"] },
  COMPLETED: { next: ["RESULT_VERIFIED"], required: ["results"] },
  RESULT_VERIFIED: { next: [], required: ["results_tx_hash"] },
};

// Validation schemas
const schemas = {
  diagnosticTest: Joi.object({
    test_type: Joi.string()
      .valid("LAB", "RADIOLOGY", "ECG", "USG", "OTHER")
      .required(),
    test_name: Joi.string().max(255).required(),
    results: Joi.object().optional(),
    status: Joi.string().valid("REQUESTED").default("REQUESTED"),
  }),
};

// Custom error classes
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

// Utility functions
const utils = {
  toDeterministicJSON(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.toDeterministicJSON(item));
    }
    if (obj && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((sortedObj, key) => {
          sortedObj[key] = this.toDeterministicJSON(obj[key]);
          return sortedObj;
        }, {});
    }
    return obj;
  },

  generateHash(data) {
    const normalizedData = this.toDeterministicJSON(data);
    const jsonString = JSON.stringify(normalizedData);

    if (CONFIG.DEBUG_HASH) {
      console.log("[DEBUG] Normalized JSON for hash:", jsonString);
    }

    return crypto.createHash("sha256").update(jsonString).digest("hex");
  },

  normalizeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString();
  },

  buildHashPayload(test) {
    return {
      test_id: test.test_id,
      encounter_id: test.encounter_id,
      test_type: test.test_type,
      test_name: test.test_name,
      requested_by: test.requested_by,
      requested_at: this.normalizeDate(test.requested_at),
      requested_staff:
        test.requested_staff ||
        (test.requested_by ? { staff_id: test.requested_by } : null),
      results: test.results,
      status: test.status,
      processed_by: test.processed_by,
      processed_at: this.normalizeDate(test.processed_at),
      processed_staff:
        test.processed_staff ||
        (test.processed_by ? { staff_id: test.processed_by } : null),
      completed_at: this.normalizeDate(test.completed_at),
    };
  },
};

// Database operations
class DatabaseService {
  static async fetchResource(table, field, value, errorMessage) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(field, value)
      .single();

    if (error || !data) {
      throw new NotFoundError(errorMessage);
    }

    return data;
  }

  static async fetchStaff(staffId) {
    return this.fetchResource(
      "medic_staff",
      "staff_id",
      staffId,
      `Staff dengan ID ${staffId}`
    );
  }

  static async fetchEncounter(encounterId) {
    return this.fetchResource(
      "encounters",
      "encounter_id",
      encounterId,
      "Encounter"
    );
  }

  static async fetchDiagnosticTest(testId) {
    return this.fetchResource(
      "diagnostic_tests",
      "test_id",
      testId,
      "Diagnostic test"
    );
  }

  static async ensureStaffObject(hashData, staffField, staffIdField) {
    if (hashData[staffField]?.staff_name) return;

    const staffId = hashData[staffField]?.staff_id || hashData[staffIdField];
    if (!staffId) return;

    try {
      const staff = await this.fetchStaff(staffId);
      hashData[staffField] = {
        staff_id: staff.staff_id,
        staff_name: staff.staff_name,
      };
    } catch {
      hashData[staffField] = { staff_id: staffId };
    }
  }
}

// Validation service
class ValidationService {
  static validateStatusTransition(currentStatus, newStatus) {
    const allowedNext = STATUS_FLOW[currentStatus]?.next || [];
    if (!allowedNext.includes(newStatus)) {
      throw new ValidationError(
        `Transisi status dari ${currentStatus} ke ${newStatus} tidak diizinkan. Allowed: ${allowedNext.join(
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

  static validateHashFields(hashData) {
    const requiredForHash = [
      "encounter_id",
      "test_type",
      "test_name",
      "requested_by",
      "requested_at",
      "requested_staff",
      "results",
      "status",
      "processed_by",
      "processed_at",
      "processed_staff",
      "completed_at",
    ];

    const missing = requiredForHash.filter((field) => {
      const value = hashData[field];
      return (
        value === undefined ||
        value === null ||
        (field === "results" && Object.keys(value || {}).length === 0)
      );
    });

    if (missing.length > 0) {
      throw new ValidationError(
        `Field '${missing.join(
          "', '"
        )}' wajib diisi dan konsisten untuk hashing hasil diagnostic test.`
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
}

// Hash service
class HashService {
  static async generateResultsHash(testData) {
    // Ensure staff objects are complete
    await Promise.all([
      DatabaseService.ensureStaffObject(
        testData,
        "requested_staff",
        "requested_by"
      ),
      DatabaseService.ensureStaffObject(
        testData,
        "processed_staff",
        "processed_by"
      ),
    ]);

    ValidationService.validateHashFields(testData);

    const hashPayload = utils.buildHashPayload(testData);
    return utils.generateHash(hashPayload);
  }
}

// Main service class
class DiagnosticTestService {
  static async create(encounterId, testData, staffId) {
    // Validate input
    const validatedData = ValidationService.validateInput(
      schemas.diagnosticTest,
      testData
    );

    // Validate encounter and staff
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
      created_by: staffId,
      updated_by: staffId,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from("diagnostic_tests")
      .insert([insertData])
      .select(CONFIG.SELECT_FIELDS)
      .single();

    if (error) {
      throw new Error(`Gagal menyimpan diagnostic test: ${error.message}`);
    }

    // Add available transitions
    data.available_transitions = STATUS_FLOW[data.status]?.next || [];
    return data;
  }

  static async update(testId, updateData, staffId) {
    const currentTest = await DatabaseService.fetchDiagnosticTest(testId);

    // Validate status transition
    if (updateData.status) {
      ValidationService.validateStatusTransition(
        currentTest.status,
        updateData.status
      );
      ValidationService.validateRequiredFields(updateData.status, updateData);
    }

    // Generate hash for COMPLETED status
    if (updateData.status === "COMPLETED") {
      const hashData = { ...currentTest, ...updateData, status: "COMPLETED" };
      updateData.results_hash = await HashService.generateResultsHash(hashData);
    }

    // Update database
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .update({
        ...updateData,
        updated_by: staffId,
        updated_at: new Date().toISOString(),
      })
      .eq("test_id", testId)
      .select(CONFIG.SELECT_FIELDS)
      .single();

    if (error) {
      throw new Error(`Gagal update diagnostic test: ${error.message}`);
    }

    return data;
  }

  static async getByEncounter(encounterId) {
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS)
      .eq("encounter_id", encounterId)
      .order("requested_at", { ascending: false });

    if (error) {
      throw new Error(`Gagal mengambil data diagnostic test: ${error.message}`);
    }

    return data;
  }

  static async getById(testId) {
    const { data, error } = await supabase
      .from("diagnostic_tests")
      .select(CONFIG.SELECT_FIELDS)
      .eq("test_id", testId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Gagal mengambil data diagnostic test: ${error.message}`);
    }

    return data;
  }

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

// Export with backward compatibility
module.exports = {
  createDiagnosticTest: DiagnosticTestService.create,
  updateDiagnosticTest: DiagnosticTestService.update,
  getDiagnosticTestsByEncounter: DiagnosticTestService.getByEncounter,
  getDiagnosticTestById: DiagnosticTestService.getById,
  getStatusFlowInfo: DiagnosticTestService.getStatusFlow,

  // Export classes for advanced usage
  DiagnosticTestService,
  ValidationError,
  NotFoundError,
};
