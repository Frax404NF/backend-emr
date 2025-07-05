const supabase = require("../config/supabase");
const { errorMessages } = require("../utils/errorMessages");

const createPatient = async (patientData) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .insert([patientData])
      .select(
        `
        patient_id,
        patient_name,
        NIK,
        date_of_birth,
        blood_type,
        gender,
        phone_number,
        emergency_contact_name,
        emergency_contact_phonenumber,
        patient_history_of_allergies,
        patient_disease_history,
        created_at,
        created_by,
        medic_staff_created:created_by (staff_id, staff_name)
      `
      )
      .single();

    if (error) {
      if (error.code === "23505")
        throw new Error(errorMessages.NIK_EXISTS.message);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

const getPatientById = async (patientId) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .select(
        `
        patient_id,
        patient_name,
        NIK,
        date_of_birth,
        blood_type,
        gender,
        phone_number,
        emergency_contact_name,
        emergency_contact_phonenumber,
        patient_history_of_allergies,
        patient_disease_history,
        created_at,
        updated_at,
        created_by,
        updated_by,
        medic_staff_created:created_by (staff_id, staff_name),
        medic_staff_updated:updated_by (staff_id, staff_name),
        is_deleted
      `
      )
      .eq("patient_id", patientId)
      .single();

    if (error) {
      if (error.code === "PGRST116")
        throw new Error(errorMessages.PATIENT_NOT_FOUND.message);
      throw new Error(error.message);
    }

    if (data.is_deleted) throw new Error(errorMessages.PATIENT_DELETED.message);

    return data;
  } catch (error) {
    throw error;
  }
};

const getAllPatients = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    // Validasi parameter paginasi
    if (page < 1 || limit < 1 || limit > 100) {
      throw new Error(errorMessages.INVALID_PAGE_LIMIT.message);
    }

    const { data, error, count } = await supabase
      .from("patients")
      .select(
        `
        patient_id,
        patient_name,
        NIK,
        date_of_birth,
        gender,
        created_at
      `,
        { count: "exact" }
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return {
      patients: data,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      limit,
    };
  } catch (error) {
    throw error;
  }
};

const updatePatient = async (patientId, updateData) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .update(updateData)
      .eq("patient_id", patientId)
      .eq("is_deleted", false)
      .select(
        `
        patient_id,
        patient_name,
        NIK,
        date_of_birth,
        blood_type,
        gender,
        phone_number,
        emergency_contact_name,
        emergency_contact_phonenumber,
        patient_history_of_allergies,
        patient_disease_history
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116")
        throw new Error(errorMessages.PATIENT_NOT_FOUND.message);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

const searchPatients = async (searchTerm) => {
  try {
    if (searchTerm.length < 3) return [];

    const { data, error } = await supabase
      .from("patients")
      .select(
        `
        patient_id,
        patient_name,
        NIK,
        date_of_birth,
        gender
      `
      )
      .eq("is_deleted", false)
      .or(`NIK.ilike.%${searchTerm}%,patient_name.ilike.%${searchTerm}%`)
      .limit(20);

    if (error) throw new Error(error.message);

    return data;
  } catch (error) {
    throw error;
  }
};

const softDeletePatient = async (patientId, staffId) => {
  try {
    const { error } = await supabase
      .from("patients")
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: staffId,
      })
      .eq("patient_id", patientId);

    if (error) throw new Error(error.message);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createPatient,
  getPatientById,
  updatePatient,
  getAllPatients,
  searchPatients,
  softDeletePatient,
};
