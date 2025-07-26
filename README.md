
# EMR API

## Overview
This Electronic Medical Records (EMR) API is a backend system built with Node.js, Express, and Supabase. It provides secure authentication, comprehensive patient management, and a full suite of clinical modules for healthcare applications. The API is designed for modularity, scalability, and maintainability, supporting both administrative and clinical workflows.

---

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

### 🏥 Clinical Modules
- Diagnosis management with ICD-10 integration
- Diagnostic test workflows (lab, radiology, ECG, USG, etc.)
- SOAP notes (Subjective, Objective, Assessment, Plan) for encounters
- Treatment recording and validation
- Vital signs recording and validation

### ⚙️ Utility & Infrastructure
- Centralized error handling and response formatting
- State machine logic for status transitions
- Hashing utilities for data integrity and security

---

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

---

## Project Structure & Module Details

```
src/
├── app.js              # Application entry point
├── config/             # Database and external service configuration
│   └── supabase.js     # Supabase connection setup
│   └── blockchain.js     # File baru untuk blockchain
│   └── ContractABI.js     # File baru untuk blockchain
├── controllers/        # Route controllers for API endpoints
│   ├── authController.js
│   ├── encounterController.js
│   ├── patientController.js
│   ├── blockchainController.js  # File baru untuk blockchain
│   ├── staffController.js
│   └── clinical/
│       ├── diagnosisController.js
│       ├── diagnosticTestController.js
│       ├── soapNotesController.js
│       ├── treatmentController.js
│       └── vitalSignsController.js
├── middleware/         # Custom middleware for request processing
│   ├── authMiddleware.js
│   ├── rbac.js
│   └── validation.js
├── routes/             # API route definitions
│   └── index.js
├── services/           # Business logic and data access
│   ├── authService.js
│   ├── encounterService.js
│   ├── patientService.js
│   ├── staffService.js
│   ├── clinical/
│   │   ├── diagnosisService.js
│   │   ├── diagnosticTestService.js
│   │   ├── soapNotesService.js
│   │   ├── treatmentService.js
│   │   └── vitalSignsService.js
│   ├── blockchain/
│   │   └── blockchainService.js # File baru untuk blockchain
│   │   └── index.js # File baru untuk blockchain
│   └── hash/
│       ├── unifiedHashService.js # File baru untuk blockchain
└── utils/              # Utility functions and helpers
    ├── errorMessages.js
    ├── response.js
    └── stateMachine.js
```

### Module Descriptions

#### app.js
Initializes the Express application, loads middleware, and registers all routes. All HTTP requests are processed through this entry point.

#### config/
- **supabase.js**: Sets up and exports the Supabase client for database operations.

#### controllers/
Controllers handle HTTP requests, validate input, and call service functions. They return responses to the client.
- **authController.js**: Manages staff authentication, registration, login, and profile endpoints.
- **encounterController.js**: Handles patient encounter creation, updates, and retrieval.
- **patientController.js**: Manages CRUD operations for patient records.
- **staffController.js**: Handles staff management and lookup.
- **clinical/**: Contains controllers for clinical modules:
  - **diagnosisController.js**: Endpoints for adding and retrieving diagnoses, including ICD-10 code integration.
  - **diagnosticTestController.js**: Endpoints for requesting, processing, and verifying diagnostic tests.
  - **soapNotesController.js**: Endpoints for managing SOAP notes for encounters.
  - **treatmentController.js**: Endpoints for recording treatments administered to patients.
  - **vitalSignsController.js**: Endpoints for recording and retrieving patient vital signs.

#### middleware/
Middleware functions process requests before they reach controllers.
- **authMiddleware.js**: Verifies authentication and token validity.
- **rbac.js**: Implements role-based access control.
- **validation.js**: Validates incoming request data.

#### routes/
- **index.js**: Main route file, imports and registers all route modules for the API.

#### services/
Services contain business logic and interact with the database.
- **authService.js**: Handles authentication logic, password hashing, and token management.
- **encounterService.js**: Manages encounter state transitions and validation.
- **patientService.js**: Handles patient data operations.
- **staffService.js**: Manages staff data and business rules.
- **clinical/**: Services for clinical modules:
  - **diagnosisService.js**: Fetches and manages diagnosis data, integrates with ICD-10 APIs.
  - **diagnosticTestService.js**: Manages diagnostic test workflows, status transitions, and validation for various test types.
  - **soapNotesService.js**: Validates and stores SOAP notes, ensuring notes are only added to active encounters.
  - **treatmentService.js**: Validates and records treatments, ensuring proper association with encounters and staff.
  - **vitalSignsService.js**: Validates and stores vital sign measurements for encounters.
- **hash/**: Hashing utilities for data integrity and security.
  - **hash.js**, **hash-2.js**, **hash-3.js**: Provide different hashing algorithms or implementations.

#### utils/
Utility functions and helpers used throughout the codebase.
- **errorMessages.js**: Centralized error message definitions.
- **response.js**: Standardizes API responses.
- **stateMachine.js**: Implements state machine logic for managing status transitions.

---

## API Endpoints


### Authentication
- `POST /auth/register` — Staff registration
- `POST /auth/login` — Staff login
- `POST /auth/signout` — Staff logout
- `GET /auth/profile` — Get staff profile

### Patient Management
- `GET /patients` — List patients (pagination & search)
- `GET /patients/search` — Search patients by keyword
- `POST /patients` — Create new patient (regular/emergency)
- `GET /patients/:id` — Get patient by ID
- `PUT /patients/:id` — Update patient
- `PUT /patients/:id/emergency-to-regular` — Convert emergency patient to regular
- `DELETE /patients/:id` — Soft delete patient

### Clinical Modules
- `POST /encounters` — Start new patient encounter
- `PUT /encounters/:id/status` — Update encounter status
- `GET /encounters/:id` — Get encounter details
- `GET /encounters` — List active encounters

- `POST /encounters/:id/diagnoses` — Add diagnosis to an encounter
- `GET /encounters/:id/diagnoses` — Get diagnoses for an encounter
- `GET /icd10/search` — Search ICD-10 codes

- `POST /encounters/:id/diagnostic-tests` — Request diagnostic test
- `GET /encounters/:id/diagnostic-tests` — List diagnostic tests for an encounter
- `GET /diagnostic-tests/:id` — Get diagnostic test detail
- `PATCH /diagnostic-tests/:id` — Update diagnostic test status

- `POST /encounters/:id/soap-notes` — Add SOAP note to an encounter
- `GET /encounters/:id/soap-notes` — Get SOAP notes for an encounter

- `POST /encounters/:id/vitals` — Record vital signs for an encounter
- `GET /encounters/:id/vitals` — Get vital signs for an encounter
- `GET /vitals/:id` — Get vital sign detail

---

## Database Schema & Validation

### Core Entities
- **Staff**: Medical staff with role-based permissions and audit fields.
- **Patients**: Patient records with comprehensive medical information and audit fields.
- **Encounters**: Records of patient visits, including status, diagnoses, tests, treatments, and notes.
- **Audit Fields**: All entities include `created_at`, `updated_at`, `created_by`, `updated_by` for traceability.

### Validation Rules
- Blood type validation (A, B, AB, O)
- Phone number format (10-15 characters)
- NIK (Indonesian ID) format validation
- Email uniqueness and format validation
- Input validation for all clinical modules using Joi schemas

---

## Security Features

- JWT-based authentication with secure token handling
- Role-based access control (RBAC) for all endpoints
- Input validation and sanitization
- Audit trails for all data modifications
- Soft delete functionality to preserve data integrity

---

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Joi and custom middleware
- **Architecture**: RESTful API with modular structure

---

## Development & Code Quality

- ESLint configuration for code consistency
- Comprehensive error handling
- Modular architecture for maintainability
- Standardized response formats

---

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

### Clinical Modules
- ✅ Diagnosis management with ICD-10 integration
- ✅ Diagnostic test workflow and status management
- ✅ SOAP notes and treatment recording
- ✅ Vital signs recording and validation

---

## Contact & Documentation

For detailed API documentation, integration guides, and technical specifications, see the internal documentation or contact the development team for access to integration guides and code examples.