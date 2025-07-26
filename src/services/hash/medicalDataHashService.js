const crypto = require("crypto");
const supabase = require("../../config/supabase");

class MedicalDataHashService {
  constructor() {
    this.DEBUG = process.env.DEBUG_HASH === "1";
  }

  /**
   * ✅ FIXED: Staff object normalization - Preserve staff_id
   */
  normalizeStaffObject(staffObj) {
    if (!staffObj || typeof staffObj !== "object") return null;
    
    return {
      staff_id: staffObj.staff_id,
      staff_name: staffObj.staff_name || null,
    };
  }

  /**
   * ✅ FIXED: Ensure complete staff data with proper staff_id handling
   */
  async ensureCompleteStaffData(testData) {
    const promises = [];
    
    // Handle requested_staff
    if (testData.requested_by && (!testData.requested_staff || !testData.requested_staff.staff_id)) {
      promises.push(
        supabase.from("medic_staff")
          .select("staff_id, staff_name")
          .eq("staff_id", testData.requested_by)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              testData.requested_staff = {
                staff_id: data.staff_id, // ✅ Explicit staff_id assignment
                staff_name: data.staff_name
              };
            } else {
              // Fallback: use staff_id from requested_by
              testData.requested_staff = {
                staff_id: testData.requested_by,
                staff_name: null
              };
            }
          })
          .catch(() => {
            // Error fallback
            testData.requested_staff = {
              staff_id: testData.requested_by,
              staff_name: null
            };
          })
      );
    }
    
    // Handle processed_staff
    if (testData.processed_by && (!testData.processed_staff || !testData.processed_staff.staff_id)) {
      promises.push(
        supabase.from("medic_staff")
          .select("staff_id, staff_name")
          .eq("staff_id", testData.processed_by)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              testData.processed_staff = {
                staff_id: data.staff_id, // ✅ Explicit staff_id assignment
                staff_name: data.staff_name
              };
            } else {
              // Fallback: use staff_id from processed_by
              testData.processed_staff = {
                staff_id: testData.processed_by,
                staff_name: null
              };
            }
          })
          .catch(() => {
            // Error fallback
            testData.processed_staff = {
              staff_id: testData.processed_by,
              staff_name: null
            };
          })
      );
    }
    
    await Promise.all(promises);
    
    // ✅ ADDITIONAL SAFETY: Ensure staff_id is always present
    if (testData.requested_staff && !testData.requested_staff.staff_id) {
      testData.requested_staff.staff_id = testData.requested_by;
    }
    
    if (testData.processed_staff && !testData.processed_staff.staff_id) {
      testData.processed_staff.staff_id = testData.processed_by;
    }

    this.debugLog("Staff data completed", {
      requested_staff: testData.requested_staff,
      processed_staff: testData.processed_staff,
    });
  }

  /**
   * ✅ Build canonical hash payload
   */
  buildMedicalHashPayload(testData) {
    const payload = {
      test_id: testData.test_id,
      encounter_id: testData.encounter_id,
      test_type: testData.test_type,
      test_name: testData.test_name,
      requested_by: testData.requested_by,
      requested_at: this.normalizeDate(testData.requested_at),
      requested_staff: this.normalizeStaffObject(testData.requested_staff) || 
        (testData.requested_by ? { staff_id: testData.requested_by, staff_name: null } : null),
      processed_by: testData.processed_by,
      processed_at: this.normalizeDate(testData.processed_at),
      processed_staff: this.normalizeStaffObject(testData.processed_staff) ||
        (testData.processed_by ? { staff_id: testData.processed_by, staff_name: null } : null),
      completed_at: this.normalizeDate(testData.completed_at),
      results: testData.results,
    };

    this.debugLog("Medical payload built", {
      testId: testData.test_id,
      includedFields: Object.keys(payload),
      excludedFields: ["status", "created_at", "updated_at", "created_by", "updated_by", "results_hash", "results_tx_hash"],
    });

    return payload;
  }

  /**
   * ✅ Generate medical data hash
   */
  async generateMedicalDataHash(testData) {
    this.debugLog(`Generating medical data hash for test ${testData.test_id}`);
    
    // Create a copy to avoid mutating original data
    const testDataCopy = { ...testData };
    
    // Ensure complete staff data
    await this.ensureCompleteStaffData(testDataCopy);
    
    // Build medical payload
    const payload = this.buildMedicalHashPayload(testDataCopy);
    
    // Generate hash
    const hash = this.generateHash(payload);
    
    this.debugLog(`Generated hash: ${hash.substring(0, 12)}...`);
    return hash;
  }

  /**
   * Generate deterministic hash
   */
  generateHash(payload) {
    const normalizedPayload = this.toDeterministicJSON(payload);
    const jsonString = JSON.stringify(normalizedPayload);
    
    if (this.DEBUG) {
      this.debugLog("Hash generation details", {
        normalizedPayload,
        jsonLength: jsonString.length,
      });
    }
    
    return crypto.createHash("sha256").update(jsonString, "utf8").digest("hex");
  }

  /**
   * Normalize date to ISO string
   */
  normalizeDate(dateValue) {
    if (!dateValue) return null;
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      this.debugLog("Invalid date detected", { dateValue });
      return dateValue;
    }
    
    return date.toISOString();
  }

  /**
   * Convert object to deterministic JSON
   */
  toDeterministicJSON(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.toDeterministicJSON(item));
    }
    
    if (obj && typeof obj === "object" && obj !== null) {
      const sortedObj = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sortedObj[key] = this.toDeterministicJSON(obj[key]);
        });
      return sortedObj;
    }
    
    return obj;
  }

  /**
   * Verify medical data integrity
   */
  async verifyMedicalDataIntegrity(testId, storedHash) {
    try {
      // Fetch complete test data
      const { data: testData, error } = await supabase
        .from("diagnostic_tests")
        .select(`
          *,
          requested_staff:requested_by(staff_id, staff_name),
          processed_staff:processed_by(staff_id, staff_name)
        `)
        .eq("test_id", testId)
        .single();

      if (error || !testData) {
        return {
          verified: false,
          reason: "Test not found",
          test_id: testId,
        };
      }

      // Generate hash for current data
      const regeneratedHash = await this.generateMedicalDataHash(testData);
      
      return {
        verified: regeneratedHash === storedHash,
        reason: regeneratedHash === storedHash 
          ? "Medical data integrity verified" 
          : "Medical data has been tampered with",
        test_id: testId,
        stored_hash: storedHash,
        regenerated_hash: regeneratedHash,
        hash_type: "medical_data_only",
        payload_used: this.buildMedicalHashPayload(testData),
      };
      
    } catch (error) {
      return {
        verified: false,
        reason: `Verification error: ${error.message}`,
        test_id: testId,
      };
    }
  }

  /**
   * Get medical hash payload structure (for debugging)
   */
  getMedicalHashPayload(testData) {
    return this.buildMedicalHashPayload(testData);
  }

  /**
   * Debug logging utility
   */
  debugLog(message, data = null) {
    if (this.DEBUG) {
      console.log(`[MEDICAL_HASH] ${message}`, data || "");
    }
  }
}

// Export singleton instance
const medicalDataHashService = new MedicalDataHashService();

module.exports = {
  MedicalDataHashService,
  medicalDataHashService,
};

