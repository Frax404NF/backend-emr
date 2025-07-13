const supabase = require("../../config/supabase");
const axios = require("axios");

const ICD10_API_URL = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search";

// Fungsi untuk mendapatkan detail diagnosis berdasarkan kode (tanpa validasi regex)
const getDiagnosisDetail = async (icdCode) => {
  try {
    const response = await axios.get(`${ICD10_API_URL}?terms=${icdCode}&maxList=1`);
    const [totalCount, codes, , names] = response.data;

    const index = codes.findIndex(c => c === icdCode);
    if (index === -1) {
      return {
        code: icdCode,
        name: `Unknown Diagnosis (${icdCode})`
      };
    }

    return {
      code: icdCode,
      name: names[index][1]
    };
  } catch (error) {
    console.error("Error getting ICD10 details:", error.message);
    return {
      code: icdCode,
      name: `Unknown Diagnosis (${icdCode})`
    };
  }
};

exports.createDiagnosis = async (encounterId, icdCode, staffId) => {
  // Dapatkan detail diagnosis
  const diagnosisDetail = await getDiagnosisDetail(icdCode);

  // Cek status encounter
  const { data: encounter, error: encounterError } = await supabase
    .from("encounters")
    .select("status")
    .eq("encounter_id", encounterId)
    .single();

  if (encounterError || !encounter) throw new Error("Encounter tidak ditemukan");
  
  const activeStatuses = ["TRIAGE", "ONGOING", "OBSERVATION"];
  if (!activeStatuses.includes(encounter.status)) {
    throw new Error("Encounter tidak dalam status aktif");
  }

  // Cek duplikasi diagnosis
  const { data: existing, error: existingError } = await supabase
    .from("diagnoses")
    .select("diagnosis_id")
    .eq("encounter_id", encounterId)
    .eq("icd10_code", icdCode)
    .single();

  if (existing) throw new Error("Diagnosis sudah tercatat untuk encounter ini");

  // Simpan diagnosis
  const { data, error: insertError } = await supabase
    .from("diagnoses")
    .insert([{
      encounter_id: encounterId,
      icd10_code: icdCode,
      diagnoses_name: diagnosisDetail.name,
      diagnosed_by: staffId,
      created_by: staffId,
      updated_by: staffId
    }])
    .select(`
      diagnosis_id,
      encounter_id,
      icd10_code,
      diagnoses_name,
      diagnosed_by,
      diagnosed_at
    `)
    .single();

  if (insertError) throw new Error(`Gagal menyimpan diagnosis: ${insertError.message}`);

  return data;
};

exports.getDiagnosesByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("diagnoses")
    .select(`
      diagnosis_id,
      encounter_id,
      icd10_code,
      diagnoses_name,
      diagnosed_at,
      medic_staff!diagnosed_by(staff_id, staff_name)
    `)
    .eq("encounter_id", encounterId)
    .order("diagnosed_at", { ascending: false });

  if (error) throw new Error(`Gagal mengambil diagnosis: ${error.message}`);
  return data;
};

exports.searchICD10 = async (query, maxResults = 10) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await axios.get(
      `${ICD10_API_URL}?terms=${encodeURIComponent(query)}&maxList=${maxResults}&sf=name,code`
    );
    const [totalCount, codes, , names] = response.data;
    return codes.map((code, index) => ({
      code: code,
      name: names[index][1]
    }));
  } catch (error) {
    throw new Error("Gagal mencari diagnosis");
  }
};