const supabase = require("../../config/supabase");
const Joi = require("joi");

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
      'RESULT_VERIFIED': ['blockchain_hash', 'verified_by']
    }
  };
};