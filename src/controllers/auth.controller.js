// src/controllers/auth.controller.js
const supabase = require("../config/supabase");
const { prisma } = require("../config/prisma");
const asyncHandler = require("express-async-handler");
const { createError } = require("../utils/error");

// Register new staff
const registerStaff = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validasi input
  if (!name || !email || !password || !role) {
    throw createError(400, "All fields are required");
  }

  // Cek email sudah terdaftar
  const existingStaff = await prisma.medicStaff.findUnique({
    where: { staff_email: email },
  });

  if (existingStaff) {
    throw createError(409, "Email already registered");
  }

  // Registrasi di Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
     options: {
      emailRedirectTo: 'http://localhost:3000/welcome', // Optional
      data: {
        name,
        role,
        skip_confirmation: true // Tambahkan ini
      }
    },
  });

  if (authError) throw createError(400, authError.message);
  if (!authData.user) throw createError(500, "User registration failed");

  // Simpan staff di database
  const staff = await prisma.medicStaff.create({
    data: {
      staff_name: name,
      staff_email: email,
      role: role,
      auth_user_id: authData.user.id,
    },
  });

  // Kembalikan response dengan token dari Supabase
  res.status(201).json({
    staff_id: staff.staff_id,
    name: staff.staff_name,
    email: staff.staff_email,
    role: staff.role,
    access_token: authData.session?.access_token || null,
    refresh_token: authData.session?.refresh_token || null,
  });
});

// Login staff
const loginStaff = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Login dengan Supabase
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) throw createError(401, authError.message);
  if (!authData.user) throw createError(401, "Authentication failed");

  // Dapatkan data staff
  const staff = await prisma.medicStaff.findUnique({
    where: { auth_user_id: authData.user.id },
  });

  if (!staff) throw createError(404, "Staff profile not found");

  // Kembalikan token dari Supabase
  res.json({
    staff_id: staff.staff_id,
    name: staff.staff_name,
    email: staff.staff_email,
    role: staff.role,
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });
});

// Refresh token
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw createError(401, "Refresh token missing");
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error) throw createError(401, "Invalid refresh token", error);

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

// Logout
const logout = asyncHandler(async (req, res) => {
  const accessToken = req.headers.authorization?.split(" ")[1];

  if (accessToken) {
    await supabase.auth.signOut(accessToken);
  }

  res.json({ message: "Logout successful" });
});

module.exports = {
  registerStaff,
  loginStaff,
  refreshToken,
  logout,
};
