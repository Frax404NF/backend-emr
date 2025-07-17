const supabase = require("../config/supabase");

// Ambil daftar staff medis dengan role DOCTOR dan NURSE
exports.getDoctorAndNurseStaff = async () => {
  const { data, error } = await supabase
    .from("medic_staff")
    .select("staff_id, staff_name, role, specialization, email")
    .in("role", ["DOCTOR", "NURSE"])
    .order("staff_name", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};
