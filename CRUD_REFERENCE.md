# Socket Backend - CRUD Operations Reference

## Overview
This document provides a comprehensive reference for all CRUD (Create, Read, Update, Delete) operations available in the socket-backend API.

**Note**: Chat functionality primarily uses **Stream Chat** (GetStream). The ChatMessages endpoints are for logging/fallback only.

## Generic Controller Functions

The `genericController.js` provides reusable CRUD functions that can be applied to any table:

### Available Functions:

#### 1. **getAll(tableName, pkName)**
- **Description**: Retrieve all records from a table
- **HTTP Method**: GET
- **Route Pattern**: `GET /endpoint`
- **Response**: Array of all records

#### 2. **getById(tableName, pkName)**
- **Description**: Retrieve a single record by ID
- **HTTP Method**: GET
- **Route Pattern**: `GET /endpoint/:id`
- **Response**: Single record object or 404 error

#### 3. **add(tableName, pkName)**
- **Description**: Create a new record
- **HTTP Method**: POST
- **Route Pattern**: `POST /endpoint`
- **Body**: JSON object with record fields
- **Response**: Newly created record with generated ID

#### 4. **edit(tableName, pkName)**
- **Description**: Update an existing record
- **HTTP Method**: PUT
- **Route Pattern**: `PUT /endpoint/:id`
- **Body**: JSON object with fields to update
- **Response**: Updated record object

#### 5. **delete(tableName, pkName)**
- **Description**: Delete a record by ID
- **HTTP Method**: DELETE
- **Route Pattern**: `DELETE /endpoint/:id`
- **Response**: Success message

#### 6. **search(tableName, pkName)**
- **Description**: Search/filter records using query parameters
- **HTTP Method**: GET
- **Route Pattern**: `GET /endpoint/search?field1=value1&field2=value2`
- **Query Params**: Any table column names with values to filter
- **Response**: Array of matching records

#### 7. **bulkAdd(tableName, pkName)**
- **Description**: Insert multiple records in a single transaction
- **HTTP Method**: POST
- **Route Pattern**: `POST /endpoint/bulk`
- **Body**: `{ "records": [record1, record2, ...] }` or array of records
- **Response**: Array of inserted IDs and success message

#### 8. **bulkDelete(tableName, pkName)**
- **Description**: Delete multiple records by IDs
- **HTTP Method**: DELETE (or POST)
- **Route Pattern**: `DELETE /endpoint/bulk` or `POST /endpoint/bulkDelete`
- **Body**: `{ "ids": [1, 2, 3, ...] }`
- **Response**: Count of deleted records and their IDs

#### 9. **count(tableName)**
- **Description**: Get total count of records (optionally with filters)
- **HTTP Method**: GET
- **Route Pattern**: `GET /endpoint/count?field1=value1`
- **Query Params**: Optional filters
- **Response**: `{ "total": number }`

#### 10. **paginate(tableName, pkName)**
- **Description**: Get paginated results
- **HTTP Method**: GET
- **Route Pattern**: `GET /endpoint/paginate?page=1&limit=10`
- **Query Params**: `page` (default: 1), `limit` (default: 10)
- **Response**: 
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## Routes with CRUD Operations

### 1. **Users** (`/Users`)
- **Table**: `Users`
- **Primary Key**: `userid`
- **Routes**:
  - `GET /Users` - Get all users
  - `GET /Users/:id` - Get user by UserID ✨ **NEW**
  - `GET /Users/role/:role` - Get users by role ✨ **NEW**
  - `GET /Users/archived/list` - Get archived (disabled) users ✨ **NEW**
  - `GET /Users/exists/username?username=...&excludeId=...` - Check if username exists ✨ **NEW**
  - `POST /Users` - Create user (custom: includes password hashing)
  - `PUT /Users/:id` - Update user (custom: includes password hashing)
  - `PUT /Users/:id/deactivate` - Soft delete user (mark as disabled) ✨ **NEW**
  - `PUT /Users/:id/reactivate` - Reactivate user ✨ **NEW**
  - `DELETE /Users/:id` - Delete user (hard delete)
  - `POST /Users/login` - Login with disabled check ✨ **ENHANCED**
  - `POST /Users/forgot-password` - Password recovery
  - `POST /Users/change-password` - Change password
  - `POST /Users/change-email` - Change email

### 2. **Patients** (`/Patient` or `/patients`)
- **Table**: `Patient`
- **Primary Key**: `PatientID` (NVARCHAR - string key)
- **Routes**:
  - `GET /Patient` - Get all patients with joined user data (FullName, Email, Phone) ✨ **ENHANCED**
  - `GET /Patient/archived/list` - Get archived (soft-deleted) patients ✨ **NEW**
  - `GET /Patient/patient/:patientId` - Get patient by PatientID (string) ✨ **NEW**
  - `GET /Patient/by-user/:userId` - Get patient by UserID (with joined data) ✨ **ENHANCED**
  - `POST /Patient` - Create patient
  - `PUT /Patient/patient/:patientId` - Update patient by PatientID (includes user data) ✨ **NEW**
  - `PUT /Patient/archive/:patientId` - Archive patient (soft delete) ✨ **NEW**
  - `PUT /Patient/restore/:patientId` - Restore archived patient ✨ **NEW**
  - `DELETE /Patient/patient/:patientId` - Delete patient by PatientID ✨ **NEW**
  - `PUT /Patient/:id` - Update patient (legacy/generic)
  - `DELETE /Patient/:id` - Delete patient (legacy/generic)

### 3. **Doctors** (`/Doctors`)
- **Table**: `Doctors`
- **Primary Key**: `DoctorID`
- **Routes**:
  - `GET /Doctors` - Get all doctors
  - `GET /Doctors/:id` - Get doctor by ID (via generic)
  - `POST /Doctors` - Create doctor
  - `PUT /Doctors/:id` - Update doctor
  - `DELETE /Doctors/:id` - Delete doctor
  - `GET /Doctors/user/:userId` - Get doctor by UserID (custom)
  - `GET /Doctors/by-role/:role` - Get doctors by role (custom)

### 4. **Appointments** (`/Appointments`)
- **Table**: `Appointments`
- **Primary Key**: `AppointmentID`
- **Routes**:
  - `GET /Appointments` - Get all appointments
  - `GET /Appointments/:appointmentId` - Get appointment by ID
  - `POST /Appointments` - Create appointment
  - `PUT /Appointments/:appointmentId` - Update appointment
  - `DELETE /Appointments/:appointmentId` - Delete appointment
  - `GET /Appointments/patient/:patientId` - Get appointments by patient
  - `GET /Appointments/date/:date` - Get appointments by specific date ✨ **NEW**
  - `GET /Appointments/active/list` - Get all active appointments ✨ **NEW**
  - `GET /Appointments/check/:patientId/:date` - Check if patient has appointment ✨ **NEW**
  - `GET /Appointments/search/filter?status=...&patientId=...` - Search/filter
  - `GET /Appointments/maxslot` - Get max slot setting

### 5. **Chat Messages** (`/ChatMessages`)
- **Note**: ⚠️ Primary chat uses **Stream Chat** (GetStream), not database CRUD
- **Table**: `ChatMessages` (optional logging/backup only)
- **Routes** (for legacy/fallback):
  - `POST /ChatMessages/saveMessage` - Log message (backup)
  - `GET /ChatMessages/list/:userId` - Get conversation list
  - `GET /ChatMessages/thread/:myId/:peerId` - Get chat thread
  - `GET /ChatMessages/getAllMessages` - Get all messages (admin)

### 6. **Transactions** (`/Transactions`)
- **Table**: `Transactions`
- **Primary Key**: `TransactionID`
- **Routes**:
  - `GET /Transactions` - Get all transactions
  - `GET /Transactions/:id` - Get transaction by ID (via generic)
  - `POST /Transactions` - Create transaction
  - `PUT /Transactions/:id` - Update transaction
  - `DELETE /Transactions/:id` - Delete transaction
  - `GET /Transactions/patient/:patientId` - Get transactions by patient
  - `GET /Transactions/service/:serviceType` - Get transactions by service
  - `GET /Transactions/date-range/:startDate/:endDate` - Get by date range

### 7. **Contact Person** (`/ContactPerson`)
- **Table**: `ContactPerson`
- **Primary Key**: Primary key varies
- **Routes**:
  - `GET /ContactPerson` - Get all
  - `POST /ContactPerson` - Create
  - `PUT /ContactPerson/:id` - Update
  - `DELETE /ContactPerson/:id` - Delete

### 8. **Family Info** (`/FamilyInfo`)
- **Routes**: Standard CRUD via generic controller

### 9. **Dental** (`/Dental`)
- **Routes**: Standard CRUD via generic controller

### 10. **Dental Records** (`/DentalRecords`)
- **Routes**: Standard CRUD via generic controller

### 11. **Medical Records** (`/MedicalRecords`)
- **Routes**: Standard CRUD via generic controller

### 12. **Medical History** (`/MedicalHistory`)
- **Routes**: Standard CRUD via generic controller

### 13. **Lab Tests** (`/LabTests`)
- **Routes**: Standard CRUD via generic controller

### 14. **Follow Ups** (`/FollowUps`)
- **Routes**: Standard CRUD via generic controller

### 15. **Account Logs** (`/AccountLogs`)
- **Routes**: Standard CRUD via generic controller

### 16. **Family History** (`/FamilyHistory`)
- **Routes**: Standard CRUD via generic controller

### 17. **Medical Checkup** (`/MedicalCheckup`)
- **Routes**: Standard CRUD via generic controller

### 18. **OB History** (`/OBHistory`)
- **Routes**: Standard CRUD via generic controller

### 19. **Past Medical History** (`/PastMedicalHistory`)
- **Routes**: Standard CRUD via generic controller

### 20. **Patient Consent** (`/PatientConsent`)
- **Routes**: Standard CRUD via generic controller

### 21. **Review Of Systems** (`/ReviewOfSystems`)
- **Routes**: Standard CRUD via generic controller

### 22. **System Settings** (`/SystemSettings`)
- **Routes**: Standard CRUD via generic controller

### 23. **Drugs And Medicine** (`/DrugsAndMedicine`)
- **Routes**: Prescription-related operations

---

## Usage Examples

### Example 1: Get All Patients
```javascript
GET http://localhost:3000/Patient

Response:
[
  { "PatientID": 1, "FirstName": "John", "LastName": "Doe", ... },
  { "PatientID": 2, "FirstName": "Jane", "LastName": "Smith", ... }
]
```

### Example 2: Create New Appointment
```javascript
POST http://localhost:3000/Appointments
Content-Type: application/json

{
  "patientId": 1,
  "appointmentDate": "2026-03-15T10:00:00",
  "status": "Pending",
  "chiefComplaint": "Checkup"
}

Response:
{
  "success": true,
  "appointmentId": 123
}
```

### Example 3: Search Appointments
```javascript
GET http://localhost:3000/Appointments/search/filter?status=Pending&patientId=1

Response:
[
  { "AppointmentID": 123, "Status": "Pending", "PatientID": 1, ... }
]
```

### Example 4: Bulk Delete Messages
```javascript
POST http://localhost:3000/ChatMessages/bulkDelete
Content-Type: application/json

{
  "messageIds": [1, 2, 3, 4, 5]
}

Response:
{
  "success": true,
  "message": "5 messages deleted",
  "deletedIds": [1, 2, 3, 4, 5]
}
```

### Example 5: Paginate Results
```javascript
GET http://localhost:3000/Patient/paginate?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Example 6: Count Records with Filter
```javascript
GET http://localhost:3000/Appointments/count?status=Completed

Response:
{
  "total": 45
}
```

### Example 7: Get Appointments by Date
```javascript
GET http://localhost:3000/Appointments/date/2026-03-15

Response:
[
  { "AppointmentID": 10, "PatientID": "P001", "AppointmentDate": "2026-03-15T10:00:00", ... },
  { "AppointmentID": 11, "PatientID": "P002", "AppointmentDate": "2026-03-15T14:30:00", ... }
]
```

### Example 8: Get All Active Appointments
```javascript
GET http://localhost:3000/Appointments/active/list

Response:
[
  { "AppointmentID": 5, "Status": "Pending", ... },
  { "AppointmentID": 12, "Status": "Confirmed", ... },
  { "AppointmentID": 18, "Status": "In Progress", ... }
]
```

### Example 9: Check if Patient Has Appointment
```javascript
GET http://localhost:3000/Appointments/check/P001/2026-03-15

Response:
{
  "hasAppointment": true,
  "count": 1
}
```

### Example 10: Get Patient by PatientID (String Key)
```javascript
GET http://localhost:3000/Patient/patient/P12345

Response:
{
  "PatientID": "P12345",
  "Age": 35,
  "UserID": 42,
  "FirstName": "Juan",
  "LastName": "Dela Cruz",
  "FullName": "Juan Cruz Dela Cruz",
  "Email": "juan@example.com",
  "PhoneNumber": "+639171234567",
  ...
}
```

### Example 11: Update Patient (Including User Data)
```javascript
PUT http://localhost:3000/Patient/patient/P12345
Content-Type: application/json

{
  "Age": 36,
  "HomeAddress": "456 New Street",
  "Email": "newemail@example.com",
  "PhoneNumber": "+639179876543"
}

Response:
{
  "success": true,
  "patient": {
    "PatientID": "P12345",
    "Age": 36,
    "FullName": "Juan Dela Cruz",
    ...
  }
}
```

---

## Notes

- ✨ **NEW** indicates recently added CRUD operations
- ✨ **ENHANCED** indicates improved operations with additional features
- All routes support both SQL Server and MySQL databases (configured via `DB_ENGINE` environment variable)
- Use query parameters for filtering and searching
- Bulk operations are wrapped in transactions for data integrity
- All timestamps use `GETDATE()` for SQL Server or `NOW()` for MySQL
- **Patient endpoints** support string PatientID keys and automatically join with Users table for enriched data
- **Patient updates** can modify both Patient and Users tables in a single transaction

---

## Adding CRUD to a New Route

To add full CRUD operations to a new route:

```javascript
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// Standard CRUD
router.get('/', generic.getAll("TableName", "PrimaryKeyName"));
router.get('/:id', generic.getById("TableName", "PrimaryKeyName"));
router.post('/', generic.add("TableName", "PrimaryKeyName"));
router.put('/:id', generic.edit("TableName", "PrimaryKeyName"));
router.delete('/:id', generic.delete("TableName", "PrimaryKeyName"));

// Optional: Advanced operations
router.get('/search', generic.search("TableName", "PrimaryKeyName"));
router.post('/bulk', generic.bulkAdd("TableName", "PrimaryKeyName"));
router.post('/bulkDelete', generic.bulkDelete("TableName", "PrimaryKeyName"));
router.get('/count', generic.count("TableName"));
router.get('/paginate', generic.paginate("TableName", "PrimaryKeyName"));

// Custom routes as needed
router.get('/custom/:param', async (req, res) => {
  // Your custom logic
});

module.exports = router;
```

Then register the route in `index.js`:
```javascript
app.use("/YourEndpoint", require("./Routes/yourroute"));
```
