const supabase = require("../config/supabase");
const EncounterStateMachine = require("../utils/stateMachine");
const { errorMessages } = require("../utils/errorMessages");

const createEncounter = async (patientId, triageData, staffId) => {
  const { chief_complaint, triage_level, initial_vitals } = triageData;

  // Validasi level triase
  const validTriageLevels = ["RED", "YELLOW", "GREEN", "BLACK"];
  if (!validTriageLevels.includes(triage_level)) {
    throw new Error(errorMessages.INVALID_TRIAGE_LEVEL.message);
  }

  // Gunakan database function untuk transaksi atomik
  const { data, error } = await supabase.rpc("create_encounter_with_vitals", {
    patient_id: patientId,
    chief_complaint,
    triage_level,
    vital_data: initial_vitals,
    staff_id: staffId,
  });

  if (error)
    throw new Error(
      error.message || errorMessages.ENCOUNTER_CREATION_FAILED.message
    );
  return data;
};

const updateStatus = async (encounterId, newStatus, staffId) => {
  // Dapatkan status saat ini
  const { data: encounter, error: fetchError } = await supabase
    .from("encounters")
    .select("status")
    .eq("encounter_id", encounterId)
    .single();

  if (fetchError) throw new Error(errorMessages.ENCOUNTER_NOT_FOUND.message);

  // Validasi transisi
  EncounterStateMachine.validateTransition(encounter.status, newStatus);

  const updateData = {
    status: newStatus,
    updated_by: staffId,
    updated_at: new Date().toISOString(),
  };

  // Set end time untuk status akhir
  if (["DISCHARGED", "ADMITTED"].includes(newStatus)) {
    updateData.encounter_end_time = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("encounters")
    .update(updateData)
    .eq("encounter_id", encounterId)
    .select("*")
    .single();

  if (error)
    throw new Error(
      error.message || errorMessages.STATUS_UPDATE_FAILED.message
    );
  return updated;
};

const getFullEncounter = async (encounterId) => {
  const { data, error } = await supabase
    .from("encounters")
    .select(
      `
      *,
      patient:patient_id(
        patient_id,
        patient_name,
        date_of_birth,
        gender,
        blood_type,
        patient_history_of_allergies,
        patient_disease_history
      ),
      vital_signs(
        vital_sign_id,
        measurement_time,
        vital_sign_data
      ),
      diagnoses(
        diagnosis_id,
        icd10_code,
        diagnoses_name,
        diagnosed_at,
        created_by
      ),
      treatments(
        treatment_id,
        treatment_type,
        treatments_details,
        administered_at
      ),
      diagnostic_tests(
        test_id,
        test_type,
        test_name,
        results
      ),
      soap_notes(
        soap_note_id,
        note_time,
        subjective,
        objective,
        assessment,
        plan
      ),
      disposition:dispositions(
        disposition_id,
        status,
        disposition_time,
        discharge_summary
      )
      medic_staff:responsible_staff_id(staff_id, staff_name)
    `
    )
    .eq("encounter_id", encounterId)
    .single();

  if (error)
    throw new Error(error.message || errorMessages.ENCOUNTER_NOT_FOUND.message);
  if (data.diagnostic_tests) {
    data.diagnostic_tests = data.diagnostic_tests.map(test => ({
      ...test,
      status: test.completed_at ? 'COMPLETED' : 'REQUESTED'
    }));
  }
  return data;
};

const getActiveEncounters = async (statusFilter = []) => {
  const defaultStatuses = ["TRIAGE", "ONGOING", "OBSERVATION", "DISPOSITION"];
  const statuses = statusFilter.length > 0 ? statusFilter : defaultStatuses;

  const { data, error } = await supabase
    .from("encounters")
    .select(
      `
      encounter_id,
      status,
      encounter_start_time,
      triage_level,
      chief_complaint,
      patient:patient_id(patient_name),
      medic_staff:responsible_staff_id(staff_id, staff_name)
    `
    )
    .in("status", statuses)
    .order("encounter_start_time", { ascending: false });

  if (error)
    throw new Error(
      error.message || errorMessages.ENCOUNTER_FETCH_FAILED.message
    );
  return data;
};

module.exports = {
  createEncounter,
  updateStatus,
  getFullEncounter,
  getActiveEncounters,
};
