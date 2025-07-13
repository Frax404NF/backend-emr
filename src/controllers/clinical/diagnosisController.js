const diagnosisService = require("../../services/clinical/diagnosisService");

exports.createDiagnosis = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { icd10_code } = req.body;
    const staffId = req.user.staff_id;

    if (!icd10_code) {
      return res.status(400).json({
        success: false,
        message: "Kode ICD10 diperlukan"
      });
    }

    const newDiagnosis = await diagnosisService.createDiagnosis(
      encounterId,
      icd10_code,
      staffId
    );

    res.status(201).json({
      success: true,
      data: newDiagnosis,
      message: "Diagnosis berhasil dicatat"
    });
  } catch (error) {
    let statusCode = 500;
    let message = error.message;

    if (error.message.includes("Encounter tidak ditemukan")) {
      statusCode = 404;
    } else if (error.message.includes("Encounter tidak dalam status aktif") || 
               error.message.includes("Diagnosis sudah tercatat")) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: message
    });
  }
};

exports.getDiagnosesByEncounter = async (req, res) => {
  try {
    const { encounterId } = req.params;
    const diagnoses = await diagnosisService.getDiagnosesByEncounter(encounterId);

    if (!diagnoses || diagnoses.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Belum ada diagnosis untuk kunjungan ini"
      });
    }

    res.json({
      success: true,
      data: diagnoses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data diagnosis"
    });
  }
};

exports.searchICD10 = async (req, res) => {
  try {
    const { terms, limit } = req.query;
    const maxResults = parseInt(limit) || 10;
    const results = await diagnosisService.searchICD10(terms, maxResults);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};