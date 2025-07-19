const supabase = require("../../config/supabase");
const Joi = require("joi");
const crypto = require("crypto");

// Helper: Deterministic JSON normalization
function toDeterministicJSON(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => toDeterministicJSON(item));
  } else if (obj && typeof obj === "object") {
    const sortedObj = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sortedObj[key] = toDeterministicJSON(obj[key]);
      });
    return sortedObj;
  }
  return obj;
}

// Helper: Generate consistent SHA-256 hash
function generateConsistentHash(data) {
  const normalizedData = toDeterministicJSON(data);
  const jsonString = JSON.stringify(normalizedData);
  // Debug: print normalized JSON string for hash
  if (process.env.DEBUG_HASH === "1") {
    console.log("[DEBUG] Normalized JSON for hash:", jsonString);
  }
  const hash = crypto.createHash("sha256");
  hash.update(jsonString);
  return hash.digest("hex");
}

// Helper: Build result hash payload
function buildResultHashPayload(test) {
  // Helper to normalize date to ISO string with Z
  function normalizeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toISOString();
  }

  const payload = {
    test_id: test.test_id,
    encounter_id: test.encounter_id,
    test_type: test.test_type,
    test_name: test.test_name,
    requested_by: test.requested_by,
    requested_at: normalizeDate(test.requested_at),
    requested_staff: test.requested_staff || (test.requested_by ? { staff_id: test.requested_by } : null),
    results: test.results,
    status: test.status,
    processed_by: test.processed_by,
    processed_at: normalizeDate(test.processed_at),
    processed_staff: test.processed_staff || (test.processed_by ? { staff_id: test.processed_by } : null),
    completed_at: normalizeDate(test.completed_at)
  };
  // Debug print
  console.log("[DEBUG] buildResultHashPayload:", JSON.stringify(payload, null, 2));
  return payload;
}
// Update diagnostic test (PATCH) with hash logic
exports.updateDiagnosticTest = async (testId, updateData, staffId) => {
  // Get current test data
  const { data: currentTest, error: fetchError } = await supabase
    .from("diagnostic_tests")
    .select("*")
    .eq("test_id", testId)
    .single();
  if (fetchError || !currentTest) {
    throw new Error("Diagnostic test tidak ditemukan");
  }

  // Validasi transisi status dan field wajib
  const statusFlow = exports.getStatusFlowInfo();
  if (updateData.status) {
    const allowedTransitions = statusFlow.transitions[currentTest.status] || [];
    if (!allowedTransitions.includes(updateData.status)) {
      throw new Error(`Transisi status dari ${currentTest.status} ke ${updateData.status} tidak diizinkan. Allowed: ${allowedTransitions.join(", ")}`);
    }
    // Validasi field wajib
    const requiredFields = statusFlow.required_fields[updateData.status] || [];
    for (const field of requiredFields) {
      if (!updateData[field]) {
        throw new Error(`Field '${field}' wajib diisi untuk status ${updateData.status}`);
      }
    }
  }

  // Pastikan relasi staff dari database masuk ke hashData sebelum validasi hash
  if (updateData.status === "COMPLETED") {
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
      "completed_at"
    ];
    let hashData = { ...currentTest, ...updateData, status: "COMPLETED" };

    // Helper to fetch staff object if only staff_id is present
    async function ensureStaffObject(staffField, staffIdField) {
      if (!hashData[staffField] || !hashData[staffField].staff_name) {
        const staffId = hashData[staffField]?.staff_id || hashData[staffIdField];
        if (staffId) {
          const { data: staffObj } = await supabase
            .from("medic_staff")
            .select("staff_id, staff_name")
            .eq("staff_id", staffId)
            .single();
          if (staffObj) {
            hashData[staffField] = { staff_id: staffObj.staff_id, staff_name: staffObj.staff_name };
          } else {
            hashData[staffField] = { staff_id: staffId };
          }
        }
      }
    }

    // Ensure requested_staff and processed_staff have staff_name
    await ensureStaffObject("requested_staff", "requested_by");
    await ensureStaffObject("processed_staff", "processed_by");

    for (const field of requiredForHash) {
      if (
        hashData[field] === undefined ||
        hashData[field] === null ||
        (field === "results" && Object.keys(hashData.results || {}).length === 0)
      ) {
        throw new Error(`Field '${field}' wajib diisi dan konsisten untuk hashing hasil diagnostic test.`);
      }
    }
  }

  // If status becomes COMPLETED and results exist, generate hash
  let results_hash = undefined;
  if (updateData.status === "COMPLETED" && updateData.results) {
    // Ambil staff info dari relasi jika belum ada di updateData
    let hashSource = { ...currentTest, ...updateData, status: "COMPLETED" };
    // Ensure staff objects have staff_name
    async function ensureStaffObjectHash(staffField, staffIdField) {
      if (!hashSource[staffField] || !hashSource[staffField].staff_name) {
        const staffId = hashSource[staffField]?.staff_id || hashSource[staffIdField];
        if (staffId) {
          const { data: staffObj } = await supabase
            .from("medic_staff")
            .select("staff_id, staff_name")
            .eq("staff_id", staffId)
            .single();
          if (staffObj) {
            hashSource[staffField] = { staff_id: staffObj.staff_id, staff_name: staffObj.staff_name };
          } else {
            hashSource[staffField] = { staff_id: staffId };
          }
        }
      }
    }
    await ensureStaffObjectHash("requested_staff", "requested_by");
    await ensureStaffObjectHash("processed_staff", "processed_by");
    const hashPayload = buildResultHashPayload(hashSource);
    results_hash = generateConsistentHash(hashPayload);
    updateData.results_hash = results_hash;
  }

  // Update database
  const { data, error } = await supabase
    .from("diagnostic_tests")
    .update({
      ...updateData,
      updated_by: staffId,
      updated_at: new Date().toISOString()
    })
    .eq("test_id", testId)
    .select(`
      *,
      requested_staff:requested_by(staff_id, staff_name),
      processed_staff:processed_by(staff_id, staff_name)
    `)
    .single();

  if (error) {
    throw new Error(`Gagal update diagnostic test: ${error.message}`);
  }

  return data;
}

// Validasi dasar untuk diagnostic test
const diagnosticTestSchema = Joi.object({
  test_type: Joi.string().valid("LAB", "RADIOLOGY", "ECG", "USG", "OTHER").required(),
  test_name: Joi.string().max(255).required(),
  results: Joi.object().optional(),
  status: Joi.string().valid("REQUESTED").default("REQUESTED") // Only REQUESTED allowed on creation
}).required();

exports.createDiagnosticTest = async (encounterId, testData, staffId) => {
  // Validasi input
  const { error, value } = diagnosticTestSchema.validate(testData);
  if (error) {
    throw new Error(`Invalid diagnostic test data: ${error.details[0].message}`);
  }

  // Force status to REQUESTED for new tests
  value.status = "REQUESTED";

  // Cek encounter
  const { data: encounter, error: encounterError } = await supabase
    .from("encounters")
    .select("encounter_id, status")
    .eq("encounter_id", encounterId)
    .single();
  if (encounterError || !encounter) {
    throw new Error("Encounter tidak ditemukan");
  }
  const activeStatuses = ["ONGOING", "OBSERVATION"];
  if (!activeStatuses.includes(encounter.status)) {
    throw new Error("Tidak dapat menambahkan diagnostic test untuk encounter yang tidak aktif");
  }

  // Validasi staff
  const { data: staff, error: staffError } = await supabase
    .from("medic_staff")
    .select("staff_id, staff_name")
    .eq("staff_id", staffId)
    .single();
  if (staffError || !staff) {
    throw new Error(`Staff dengan ID ${staffId} tidak ditemukan`);
  }

  // Simpan ke database
  const { data, error: insertError } = await supabase
    .from("diagnostic_tests")
    .insert([
      {
        encounter_id: encounterId,
        test_type: value.test_type,
        test_name: value.test_name,
        requested_by: staffId,
        requested_at: new Date().toISOString(),
        results: value.results || null,
        status: value.status,
        processed_by: value.processed_by || null,
        processed_at: value.processed_at || null,
        completed_at: value.completed_at || null,
        created_by: staffId,
        updated_by: staffId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select(`
      test_id,
      encounter_id,
      test_type,
      test_name,
      requested_by,
      requested_at,
      results,
      status,
      processed_by,
      processed_at,
      completed_at,
      requested_staff:requested_by(staff_id, staff_name),
      processed_staff:processed_by(staff_id, staff_name)
    `)
    .single();

  if (insertError) {
    throw new Error(`Gagal menyimpan diagnostic test: ${insertError.message}`);
  }
  // Add available transitions for frontend
  data.available_transitions = ["IN_PROGRESS"];
  return data;
};

exports.getDiagnosticTestsByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("diagnostic_tests")
    .select(`
      test_id,
      encounter_id,
      test_type,
      test_name,
      requested_by,
      requested_at,
      results,
      status,
      processed_by,
      processed_at,
      completed_at,
      requested_staff:requested_by(staff_id, staff_name),
      processed_staff:processed_by(staff_id, staff_name)
    `)
    .eq("encounter_id", encounterId)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data diagnostic test: ${error.message}`);
  }
  return data;
};

exports.getDiagnosticTestById = async (testId) => {
  const { data, error } = await supabase
    .from("diagnostic_tests")
    .select(`
      test_id,
      encounter_id,
      test_type,
      test_name,
      requested_by,
      requested_at,
      results,
      status,
      processed_by,
      processed_at,
      completed_at,
      requested_staff:requested_by(staff_id, staff_name),
      processed_staff:processed_by(staff_id, staff_name)
    `)
    .eq("test_id", testId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Gagal mengambil data diagnostic test: ${error.message}`);
  }

  return data;
};

// Helper function to get status flow info
exports.getStatusFlowInfo = function() {
  return {
    statuses: ['REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'RESULT_VERIFIED'],
    transitions: {
      'REQUESTED': ['IN_PROGRESS'],
      'IN_PROGRESS': ['COMPLETED'],
      'COMPLETED': ['RESULT_VERIFIED'],
      'RESULT_VERIFIED': []
    },
    required_fields: {
      'IN_PROGRESS': ['processed_by'],
      'COMPLETED': ['results'],
      'RESULT_VERIFIED': ['results_tx_hash']
    }
  };
};