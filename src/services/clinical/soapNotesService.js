const supabase = require("../../config/supabase");
const Joi = require("joi");

// Validasi dasar untuk SOAP Notes
const soapNoteSchema = Joi.object({
  subjective: Joi.string().allow("").optional(),
  objective: Joi.string().allow("").optional(),
  assessment: Joi.string().allow("").optional(),
  plan: Joi.string().allow("").optional(),
}).min(1); // Minimal harus ada 1 field

exports.createSoapNote = async (encounterId, noteData, staffId) => {
  // Validasi input
  const { error, value } = soapNoteSchema.validate(noteData);
  if (error) {
    throw new Error(`Invalid SOAP Note data: ${error.details[0].message}`);
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
    throw new Error("Tidak dapat menambahkan SOAP Notes untuk encounter yang tidak aktif");
  }

  // Simpan ke database
  const { data, error: insertError } = await supabase
    .from("soap_notes")
    .insert([
      {
        encounter_id: encounterId,
        subjective: value.subjective,
        objective: value.objective,
        assessment: value.assessment,
        plan: value.plan,
        created_by: staffId,
        updated_by: staffId,
        note_time: new Date().toISOString(),
      },
    ])
    .select(`
      soap_note_id,
      encounter_id,
      note_time,
      subjective,
      objective,
      assessment,
      plan,
      created_by,
      updated_by,
      created_at,
      updated_at,
      medic_staff:created_by(staff_id, staff_name)
    `)
    .single();

  if (insertError) {
    throw new Error(`Gagal menyimpan SOAP Notes: ${insertError.message}`);
  }
  return data;
};

exports.getSoapNotesByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("soap_notes")
    .select(`
      soap_note_id,
      encounter_id,
      note_time,
      subjective,
      objective,
      assessment,
      plan,
      created_by,
      updated_by,
      created_at,
      updated_at,
      medic_staff:created_by(staff_id, staff_name)
    `)
    .eq("encounter_id", encounterId)
    .order("note_time", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil SOAP Notes: ${error.message}`);
  }
  return data;
};
