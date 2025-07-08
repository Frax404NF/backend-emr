# EMR API

## Overview
Electronic Medical Records (EMR) API system built with Node.js, Express, and Supabase. This API provides secure authentication and comprehensive patient management capabilities for healthcare applications.

## Features

### 🔐 Authentication Module
- Staff registration, login, logout, and profile management
- Role-based access control (Admin, Doctor, Nurse, Patient)
- JWT-based authentication with refresh tokens
- Input validation and security middleware

### 👥 Patient Management Module
- Full CRUD operations for patient records
- Soft delete functionality with audit trails
- Server-side pagination and search capabilities
- Role-based access control for data security
- Comprehensive validation and error handling

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

### Installation
```bash
npm install
```

### Environment Setup
Create a `.env` file with your Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### Running the Application
```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Documentation

For detailed API documentation, integration guides, and technical specifications, see the internal documentation:

- **For Frontend Developers**: Start with authentication and patient management integration guides
- **For Backend Developers**: Review project structure and schema alignment documentation
- **For Database Management**: Check schema requirements and validation rules

**Note**: Comprehensive API documentation is available in the development environment. Contact the development team for access to detailed integration guides and code examples.

## API Endpoints

### Authentication
- `POST /auth/register` - Staff registration
- `POST /auth/login` - Staff login
- `POST /auth/logout` - Staff logout
- `GET /auth/profile` - Get staff profile

### Patient Management
- `GET /patients` - List patients (with pagination and search)
- `POST /patients` - Create new patient
- `GET /patients/:id` - Get patient by ID
- `PUT /patients/:id` - Update patient
- `DELETE /patients/:id` - Soft delete patient

## Database Schema

### Core Entities
- **Staff**: Medical staff with role-based permissions
- **Patients**: Patient records with comprehensive medical information
- **Audit Fields**: All entities include created_at, updated_at, created_by, updated_by

### Validation Rules
- Blood type validation (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Phone number format (10-15 characters)
- NIK (Indonesian ID) format validation
- Email uniqueness and format validation

## Security Features

- JWT-based authentication with secure token handling
- Role-based access control (RBAC) for all endpoints
- Input validation and sanitization
- Audit trails for all data modifications
- Soft delete functionality to preserve data integrity

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Custom middleware with comprehensive rules
- **Architecture**: RESTful API with modular structure

## Development

### Project Structure
```
src/
├── app.js              # Application entry point
├── config/             # Configuration files
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── routes/             # API routes
├── services/           # Business logic
└── utils/              # Utility functions
```

### Code Quality
- ESLint configuration for code consistency
- Comprehensive error handling
- Modular architecture for maintainability
- Standardized response formats

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Ensure all validations pass
5. Submit a pull request

## License

This project is proprietary software developed for healthcare applications.

---

## Recent Updates

### Authentication Module
- ✅ Secure staff authentication with JWT
- ✅ Role-based access control implementation
- ✅ Comprehensive input validation
- ✅ Integration with Supabase authentication

### Patient Management Module  
- ✅ Complete CRUD operations with audit trails
- ✅ Soft delete functionality for data preservation
- ✅ Advanced search and pagination capabilities
- ✅ Schema alignment with database constraints
- ✅ Role-based data access controls