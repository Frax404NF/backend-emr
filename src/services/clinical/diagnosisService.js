const supabase = require("../../config/supabase");
const axios = require("axios");

const ICD10_API_URL =
  "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";
const ACTIVE_STATUSES = ["TRIAGE", "ONGOING", "OBSERVATION"];

// Helper untuk error handling yang konsisten
const handleSupabaseError = (error, context) => {
  throw new Error(`${context}: ${error.message}`);
};

// Fungsi untuk mendapatkan detail diagnosis
const getDiagnosisDetail = async (icdCode) => {
  try {
    const response = await axios.get(
      `${ICD10_API_URL}?terms=${icdCode}&maxList=1`
    );
    const [, codes, , names] = response.data;

    const index = codes.findIndex((c) => c === icdCode);
    return {
      code: icdCode,
      name: index === -1 ? `Unknown Diagnosis (${icdCode})` : names[index][1],
    };
  } catch (error) {
    console.error("Error getting ICD10 details:", error.message);
    return { code: icdCode, name: `Unknown Diagnosis (${icdCode})` };
  }
};

// Validasi encounter dengan optimasi query
const validateEncounter = async (encounterId) => {
  const { data: encounter, error } = await supabase
    .from("encounters")
    .select("status")
    .eq("encounter_id", encounterId)
    .single();

  if (error || !encounter) throw new Error("Encounter tidak ditemukan");
  if (!ACTIVE_STATUSES.includes(encounter.status)) {
    throw new Error("Encounter tidak dalam status aktif");
  }
  return encounter;
};

// Cek duplikasi diagnosis
const checkDuplicateDiagnosis = async (encounterId, icdCode) => {
  const { data: existing } = await supabase
    .from("diagnoses")
    .select("diagnosis_id")
    .eq("encounter_id", encounterId)
    .eq("icd10_code", icdCode)
    .maybeSingle(); // Menggunakan maybeSingle untuk handling yang lebih baik

  if (existing) throw new Error("Diagnosis sudah tercatat untuk encounter ini");
};

exports.createDiagnosis = async (encounterId, icdCode, staffId) => {
  // Parallel execution untuk validasi yang tidak saling bergantung
  const [diagnosisDetail] = await Promise.all([
    getDiagnosisDetail(icdCode),
    validateEncounter(encounterId),
    checkDuplicateDiagnosis(encounterId, icdCode),
  ]);

  // Insert dengan error handling yang konsisten
  const { data, error } = await supabase
    .from("diagnoses")
    .insert({
      encounter_id: encounterId,
      icd10_code: icdCode,
      diagnoses_name: diagnosisDetail.name,
      diagnosed_by: staffId,
      created_by: staffId,
      updated_by: staffId,
    })
    .select(
      `
      diagnosis_id,
      encounter_id,
      icd10_code,
      diagnoses_name,
      diagnosed_by,
      diagnosed_at
    `
    )
    .single();

  if (error) handleSupabaseError(error, "Gagal menyimpan diagnosis");
  return data;
};

exports.getDiagnosesByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("diagnoses")
    .select(
      `
      diagnosis_id,
      encounter_id,
      icd10_code,
      diagnoses_name,
      diagnosed_at,
      medic_staff!diagnosed_by(staff_id, staff_name)
    `
    )
    .eq("encounter_id", encounterId)
    .order("diagnosed_at", { ascending: false });

  if (error) handleSupabaseError(error, "Gagal mengambil diagnosis");
  return data;
};

exports.searchICD10 = async (query, maxResults = 10) => {
  if (!query?.trim() || query.trim().length < 2) return [];

  try {
    const response = await axios.get(
      `${ICD10_API_URL}?terms=${encodeURIComponent(
        query
      )}&maxList=${maxResults}&sf=name,code`
    );

    const [, codes, , names] = response.data;
    return codes.map((code, index) => ({
      code,
      name: names[index][1],
    }));
  } catch (error) {
    throw new Error("Gagal mencari diagnosis");
  }
};
