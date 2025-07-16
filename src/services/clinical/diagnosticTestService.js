const supabase = require("../../config/supabase");
const Joi = require("joi");

// Validasi dasar untuk diagnostic test
const diagnosticTestSchema = Joi.object({
  test_type: Joi.string().valid("LAB", "RADIOLOGY", "ECG", "USG", "OTHER").required(),
  test_name: Joi.string().max(255).required(),
  results: Joi.object().optional(),
  status: Joi.string().valid(
    "REQUESTED",
    "REQUEST_VERIFIED",
    "IN_PROGRESS",
    "COMPLETED",
    "RESULT_VERIFIED"
  ).required(),
  processed_by: Joi.number().optional(),
  processed_at: Joi.date().optional(),
  completed_at: Joi.date().optional()
}).required();

exports.createDiagnosticTest = async (encounterId, testData, staffId) => {
  // Validasi input
  const { error, value } = diagnosticTestSchema.validate(testData);
  if (error) {
    throw new Error(`Invalid diagnostic test data: ${error.details[0].message}`);
  }

  // Cek encounter
  const { data: encounter, error: encounterError } = await supabase
    .from("encounters")
    .select("encounter_id, status")
    .eq("encounter_id", encounterId)
    .single();
  if (encounterError || !encounter) {
    throw new Error("Encounter tidak ditemukan");
  }
  const activeStatuses = ["TRIAGE", "ONGOING", "OBSERVATION"];
  if (!activeStatuses.includes(encounter.status)) {
    throw new Error("Tidak dapat menambahkan diagnostic test untuk encounter yang tidak aktif");
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
        updated_by: staffId
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
      medic_staff:requested_by(staff_id, staff_name)
    `)
    .single();

  if (insertError) {
    throw new Error(`Gagal menyimpan diagnostic test: ${insertError.message}`);
  }
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
      medic_staff:requested_by(staff_id, staff_name)
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
    .select("*")
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