const policies = {
  Dokter: {
    permissions: [
      "patients:read",
      "patients:create",
      "diagnoses:create",
      "treatments:create",
      "soap_notes:create",
      "vital_signs:create",
      "medical_records:read",
      "medical_records:create",
      "encounters:create",
      "encounters:read",
      "encounters:update",
    ],
  },
  Perawat: {
    permissions: [
      "patients:read",
      "vital_signs:create",
      "medical_records:read",
      "soap_notes:create",
      "treatments:create",
      "encounters:create",
      "encounters:read",
      "encounters:update"
    ],
  },
  Admin: {
    permissions: ["*"],
  },
  Pasien: {
    permissions: ["profile:read", "medical_records:read"],
  },
};

const checkPermission = (userRole, requiredPermission) => {
  const policy = policies[userRole];
  if (!policy) return false;

  return (
    policy.permissions.includes("*") ||
    policy.permissions.includes(requiredPermission)
  );
};

module.exports = {
  policies,
  checkPermission,
};
