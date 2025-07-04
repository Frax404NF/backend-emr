##  feat(auth): implement secure staff authentication module
- Initial implementation of the staff authentication and authorization module for the EMR system.

This commit introduces the core features for managing and authenticating medical staff, including:
- Staff registration, login, logout, and profile retrieval.
- Role-based access control (Admin, Dokter, Perawat).
- JWT-based authentication for securing API endpoints.
- Input validation for email uniqueness and password strength.
- Middleware for authentication and role checks.

Integrates with Supabase for user management and PostgreSQL database, providing a secure and scalable foundation for future modules.
