##  feat(auth): implement secure staff authentication module
- Initial implementation of the staff authentication and authorization module for the EMR system.

This commit introduces the core features for managing and authenticating medical staff, including:
- Staff registration, login, logout, and profile retrieval.
- Role-based access control (Admin, Dokter, Perawat).
- JWT-based authentication for securing API endpoints.
- Input validation for email uniqueness and password strength.
- Middleware for authentication and role checks.

Integrates with Supabase for user management and PostgreSQL database, providing a secure and scalable foundation for future modules.

## feat(patient): implement comprehensive patient management module

Initial implementation of the patient data management module. This provides a robust and secure foundation for all patient-related workflows within the EMR system.

This commit introduces a complete set of features for the patient lifecycle, including:
- Full CRUD (Create, Read, Update, Delete) operations with dedicated endpoints.
- Soft Delete functionality to archive records instead of permanently deleting them, preserving the audit trail (`deleted_at`, `deleted_by`).
- Server-side pagination for efficiently handling large lists of patients.
- Search capability by patient NIK or name.
- Robust validation middleware for data integrity (NIK format, phone number, non-updatable NIK).
- Role-Based Access Control (RBAC) to restrict actions based on staff roles.
- Automatic injection of audit trail fields (`created_by`, `updated_by`).