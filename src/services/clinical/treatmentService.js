const supabase = require("../../config/supabase");
const Joi = require("joi");

// Validasi dasar untuk treatment
const treatmentSchema = Joi.object({
  treatment_type: Joi.string().max(50).required(),
  administered_at: Joi.date().iso().required(),
  treatments_details: Joi.object().required(),
});

exports.createTreatment = async (encounterId, treatmentData, staffId) => {
  // Debug: log payload yang diterima
  console.log("Payload diterima di service:", treatmentData);
  const { error, value } = treatmentSchema.validate(treatmentData);
  if (error) {
    console.error("Joi validation error (service):", error.details);
    const err = new Error(`Invalid treatment data: ${error.details[0].message}`);
    err.details = error.details; // Pass Joi details to controller
    throw err;
    // Setelah throw, eksekusi berhenti otomatis
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
    throw new Error("Tidak dapat menambahkan treatment untuk encounter yang tidak aktif");
  }

  // Pastikan value hasil validasi ada
  if (!value) {
    throw new Error("Validasi gagal, data treatment tidak valid");
  }

  // Simpan ke database
  const treatmentPayload = {
    encounter_id: encounterId,
    treatment_type: value.treatment_type,
    treatments_details: value.treatments_details,
    administered_by: staffId,
    created_by: staffId,
    updated_by: staffId,
    administered_at: value.administered_at || new Date().toISOString(),
  };

  const { data, error: insertError } = await supabase
    .from("treatments")
    .insert([treatmentPayload])
    .select(`
      treatment_id,
      encounter_id,
      treatment_type,
      treatments_details,
      administered_by,
      administered_at,
      medic_staff:administered_by(staff_id, staff_name)
    `)
    .single();

  if (insertError) {
    throw new Error(`Gagal menyimpan treatment: ${insertError.message}`);
  }
  return data;
};

exports.getTreatmentsByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("treatments")
    .select(`
      treatment_id,
      encounter_id,
      treatment_type,
      treatments_details,
      administered_by,
      administered_at,
      medic_staff:administered_by(staff_id, staff_name)
    `)
    .eq("encounter_id", encounterId)
    .order("administered_at", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data treatment: ${error.message}`);
  }
  return data;
};
