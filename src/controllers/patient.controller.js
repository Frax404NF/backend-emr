const { prisma } = require('../config/prisma');
const { createError } = require('../utils/error');

// Create a new patient
const createPatient = async (req, res, next) => {
  try {
    const patientData = req.body;
    const patient = await prisma.patients.create({
      data: patientData,
    });
    res.status(201).json(patient);
  } catch (error) {
    next(createError(500, 'Failed to create patient', error));
  }
};

// Get patient by ID
const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patients.findUnique({
      where: { patient_id: id },
    });

    if (!patient) {
      return next(createError(404, 'Patient not found'));
    }

    res.json(patient);
  } catch (error) {
    next(createError(500, 'Failed to get patient', error));
  }
};

// Update patient
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientData = req.body;

    const updatedPatient = await prisma.patients.update({
      where: { patient_id: id },
      data: patientData,
    });

    res.json(updatedPatient);
  } catch (error) {
    next(createError(500, 'Failed to update patient', error));
  }
};

// Get all patients
const getAllPatients = async (req, res, next) => {
  try {
    const patients = await prisma.patients.findMany();
    res.json(patients);
  } catch (error) {
    next(createError(500, 'Failed to get patients', error));
  }
};

module.exports = {
  createPatient,
  getPatientById,
  updatePatient,
  getAllPatients,
};
