const supabase = require("../config/supabase");
const errorMessages = require("../utils/errorMessages");

const createPatient = async (patientData) => {
  try {
    // Handle emergency patient creation
    if (patientData.is_emergency) {
      // Generate temporary NIK for emergency patients
      const tempNIK = generateTempNIK();

      // For emergency patients, use input date or current date as placeholder
      // This is required because the database has a NOT NULL constraint on date_of_birth
      const emergencyPatientData = {
        ...patientData,
        NIK: tempNIK,
        date_of_birth: patientData.date_of_birth || new Date().toISOString().split('T')[0], // Use input date or today as fallback
        patient_history_of_allergies: patientData.patient_history_of_allergies || "Tidak diketahui",
        patient_disease_history: patientData.patient_disease_history || "Tidak diketahui",
        is_emergency: true,
        is_temporary: true, // Flag to indicate this is temporary registration
      };

      const { data, error } = await supabase
        .from("patients")
        .insert([emergencyPatientData])
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
          is_emergency,
          is_temporary,
          medic_staff_created:created_by (staff_id, staff_name)
        `
        )
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }

    // Regular patient creation
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

// Generate temporary NIK for emergency patients
const generateTempNIK = () => {
  const timestamp = Date.now().toString();
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  // Format: TEMP + 8 digits from timestamp + 2 random digits = 14 characters total
  return `TEMP${timestamp.slice(-8)}${randomNum}`;
};

// Function to update emergency patient with complete information
const updateEmergencyPatientToRegular = async (patientId, completeData) => {
  try {
    const { data, error } = await supabase
      .from("patients")
      .update({
        ...completeData,
        is_emergency: false,
        is_temporary: false,
        updated_at: new Date().toISOString(),
      })
      .eq("patient_id", patientId)
      .eq("is_emergency", true)
      .select()
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
  updateEmergencyPatientToRegular,
};
