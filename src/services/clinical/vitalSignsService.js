// src/services/vitalSignsService.js
const supabase = require("../../config/supabase");
const Joi = require("joi");

// Validasi dasar untuk vital sign
const vitalSignSchema = Joi.object({
  systolic: Joi.number().min(60).max(300).optional(),
  diastolic: Joi.number().min(40).max(200).optional(),
  heart_rate: Joi.number().min(30).max(250).optional(),
  temperature: Joi.number().min(30).max(45).optional(),
  respiratory_rate: Joi.number().min(5).max(60).optional(),
  oxygen_saturation: Joi.number().min(0).max(100).optional(),
  pain_scale: Joi.number().min(0).max(10).optional(),
  gcs: Joi.number().min(3).max(15).optional(),
  height: Joi.number().min(30).max(250).optional(),
  weight: Joi.number().min(1).max(300).optional(),
  custom_fields: Joi.object().optional(),
}).min(1); // Minimal harus ada 1 field

exports.createVitalSign = async (encounterId, vitalData, staffId) => {
  // Cek apakah ada data yang dikirim
  if (!vitalData || Object.keys(vitalData).length === 0) {
    throw new Error("Data tanda vital diperlukan");
  }

  // Validasi input
  const { error, value } = vitalSignSchema.validate(vitalData);
  if (error) {
    throw new Error(`Invalid vital sign data: ${error.details[0].message}`);
  }

  // Cek apakah encounter ada dan aktif
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
    throw new Error("Tidak dapat menambahkan vital sign untuk encounter yang tidak aktif");
  }

  // Simpan ke database menggunakan Supabase
  const { data, error: insertError } = await supabase
    .from("vital_signs")
    .insert([
      {
        encounter_id: encounterId,
        vital_sign_data: value,
        created_by: staffId,
        measurement_time: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (insertError) {
    throw new Error(`Gagal menyimpan vital sign: ${insertError.message}`);
  }

  return data;
};

exports.getVitalSignsByEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("vital_signs")
    .select(`
      *,
      medic_staff:created_by(staff_id, staff_name)
    `)
    .eq("encounter_id", encounterId)
    .order("measurement_time", { ascending: false });

  if (error) {
    throw new Error(`Gagal mengambil data vital signs: ${error.message}`);
  }

  return data;
};

exports.getVitalSignById = async (id) => {
  const { data, error } = await supabase
    .from("vital_signs")
    .select("*")
    .eq("vital_sign_id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Data tidak ditemukan
    }
    throw new Error(`Gagal mengambil data vital sign: ${error.message}`);
  }

  return data;
};
