const staffService = require("../services/staffService");

exports.getDoctorAndNurseStaff = async (req, res) => {
  try {
    const staffList = await staffService.getDoctorAndNurseStaff();
    res.status(200).json({ success: true, data: staffList });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
