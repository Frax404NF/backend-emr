const supabase = require("../config/supabase");

const signUp = async (staffData) => {
  const { email, password, staff_name, role, specialization } = staffData;

  // Cek apakah email sudah terdaftar
  const { data: existingUser, error: emailError } = await supabase
    .from('medic_staff')
    .select('*')
    .eq('email', email);

  if (emailError) throw new Error(emailError.message);
  if (existingUser && existingUser.length > 0) {
    throw new Error('Email already registered');
  }

  // Buat user di Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw new Error(authError.message);

  // Buat record di medic_staff
  const staffRecord = {
    auth_uid: authUser.user.id,
    email,
    staff_name,
    role,
    specialization: role === "DOCTOR" ? specialization : null,
  };

  const { data: staff, error: staffError } = await supabase
    .from("medic_staff")
    .insert([staffRecord])
    .select()
    .single();

  if (staffError) {
    if (staffError.code === '23505') {
      throw new Error("Email already registered");
    }
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(staffError.message);
  }

  return staff;
};

const signIn = async (credentials) => {
  const { email, password } = credentials;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  const { data: staff } = await supabase
    .from("medic_staff")
    .select("staff_id, staff_name, role, specialization")
    .eq("auth_uid", data.user.id)
    .single();

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: staff,
  };
};

const signOut = async (accessToken) => {
  const { error } = await supabase.auth.signOut(accessToken);
  if (error) throw new Error(error.message);
  return { success: true };
};

const getStaffProfile = async (authUid) => {
  const { data, error } = await supabase
    .from("medic_staff")
    .select("staff_id, staff_name, role, specialization")
    .eq("auth_uid", authUid)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

module.exports = {
  signUp,
  signIn,
  signOut,
  getStaffProfile,
};
