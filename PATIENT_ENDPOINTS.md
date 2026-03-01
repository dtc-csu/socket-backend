# Patient API Endpoints

## Database Compatibility
✅ **Works with both MSSQL and MySQL**
- Uses `CONCAT()` and `COALESCE()` functions (SQL standard)
- Compatible with SQL Server 2012+ and MySQL 5.7+
- Automatically converted via `db.js` abstraction layer

---

## C# Facade Methods → API Endpoint Mapping

### 1. GetByPatientID(string patientId)
**Endpoint**: `GET /Patient/patient/:patientId`

**Usage**:
```csharp
// C# Facade
var patient = PatientFacade.GetByPatientID("P12345");

// API Call
GET http://localhost:3000/Patient/patient/P12345
```

**Response**:
```json
{
  "PatientID": "P12345",
  "BirthDate": "1990-05-15",
  "Age": 35,
  "Religion": "Catholic",
  "Nationality": "Filipino",
  "Sex": "Male",
  "HomeAddress": "123 Main St",
  "Occupation": "Engineer",
  "UserID": 42,
  "FirstName": "Juan",
  "MiddleName": "Cruz",
  "LastName": "Dela Cruz",
  "Email": "juan@example.com",
  "PhoneNumber": "+639171234567",
  "Role": "Patient",
  "FullName": "Juan Cruz Dela Cruz"
}
```

**Error Response** (404):
```json
{
  "error": "Patient not found"
}
```

---

### 2. GetAll()
**Endpoint**: `GET /Patient`

**Usage**:
```csharp
// C# Facade
var patients = PatientFacade.GetAll(); // With joined user data

// API Call
GET http://localhost:3000/Patient
```

**Response**:
```json
[
  {
    "PatientID": "P12345",
    "BirthDate": "1990-05-15",
    "Age": 35,
    "UserID": 42,
    "FirstName": "Juan",
    "MiddleName": "Cruz",
    "LastName": "Dela Cruz",
    "Email": "juan@example.com",
    "PhoneNumber": "+639171234567",
    "FullName": "Juan Cruz Dela Cruz",
    "HomeAddress": "123 Main St",
    ...
  },
  {
    "PatientID": "P12346",
    ...
  }
]
```

**Features**:
- Automatically joins with `Users` table
- Returns `FullName` computed as `FirstName + MiddleName + LastName`
- Includes email and phone from Users table
- No need for client-side joins

---

### 3. UpdatePatient(string patientId, Patient model)
**Endpoint**: `PUT /Patient/patient/:patientId`

**Usage**:
```csharp
// C# Facade
PatientFacade.UpdatePatient("P12345", patientModel);

// API Call
PUT http://localhost:3000/Patient/patient/P12345
```

**Request Body**:
```json
{
  "Age": 36,
  "HomeAddress": "456 New Street",
  "Occupation": "Senior Engineer",
  "Email": "newemail@example.com",
  "PhoneNumber": "+639179876543",
  "FirstName": "Juan",
  "LastName": "Dela Cruz"
}
```

**Features**:
- Updates Patient table fields
- **Optionally updates Users table** (Email, PhoneNumber, FirstName, MiddleName, LastName)
- Uses transaction for data consistency
- Returns updated patient with joined user data

**Response**:
```json
{
  "success": true,
  "patient": {
    "PatientID": "P12345",
    "Age": 36,
    "HomeAddress": "456 New Street",
    "Email": "newemail@example.com",
    "PhoneNumber": "+639179876543",
    "FullName": "Juan Dela Cruz",
    ...
  }
}
```

---

### 4. DeletePatient(string patientId)
**Endpoint**: `DELETE /Patient/patient/:patientId` (Hard Delete)

**Usage**:
```csharp
// C# Facade
PatientFacade.DeletePatient("P12345");

// API Call
DELETE http://localhost:3000/Patient/patient/P12345
```

**Response**:
```json
{
  "success": true,
  "message": "Patient P12345 deleted"
}
```

**Note**: This is a hard delete - permanently removes the Patient record. For non-destructive archival, use soft delete below.

---

## Soft Delete / Archive Operations ✨ **NEW**

### Archive Patient (Soft Delete)
**Endpoint**: `PUT /Patient/archive/:patientId`

**Usage**:
```csharp
// API Call
PUT http://localhost:3000/Patient/archive/P12345
```

**Response**:
```json
{
  "success": true,
  "message": "Patient P12345 archived"
}
```

**What happens**: Sets `EndDate = NOW()`. Patient is hidden from normal listing but retained in database.

---

### Restore Patient (Unarchive)
**Endpoint**: `PUT /Patient/restore/:patientId`

**Usage**:
```csharp
// API Call
PUT http://localhost:3000/Patient/restore/P12345
```

**Response**:
```json
{
  "success": true,
  "message": "Patient P12345 restored"
}
```

**What happens**: Clears `EndDate = NULL`. Patient reappears in normal listing.

---

### Get Archived Patients
**Endpoint**: `GET /Patient/archived/list`

**Usage**:
```csharp
// API Call
GET http://localhost:3000/Patient/archived/list
```

**Response**:
```json
[
  {
    "PatientID": "P12345",
    "FirstName": "Juan",
    "LastName": "Dela Cruz",
    "EndDate": "2026-02-28T10:30:00Z",
    "FullName": "Juan Cruz Dela Cruz",
    ...
  },
  ...
]
```

**Note**: Returns all patients where `EndDate IS NOT NULL`. Ordered by EndDate (most recent first).

---

## Additional Endpoints

### Get Patient by UserID
**Endpoint**: `GET /Patient/by-user/:userId`

**Usage**:
```csharp
// API Call
GET http://localhost:3000/Patient/by-user/42
```

**Response**:
```json
{
  "success": true,
  "patient": {
    "PatientID": "P12345",
    "UserID": 42,
    "FirstName": "Juan",
    "FullName": "Juan Cruz Dela Cruz",
    ...
  }
}
```

### Create Patient
**Endpoint**: `POST /Patient`

**Request Body**:
```json
{
  "PatientID": "P12350",
  "Age": 25,
  "Sex": "Female",
  "HomeAddress": "789 Oak Ave",
  "UserID": 50
}
```

---

## Route Ordering (Important!)

The routes in `patients.js` are ordered to avoid conflicts:

```javascript
✅ Correct Order:
1. GET /Patient                        ← Get all (active only)
2. GET /Patient/archived/list          ← Get archived patients ✨ NEW
3. GET /Patient/patient/:patientId     ← Specific route
4. GET /Patient/by-user/:userId        ← Specific route
5. POST /Patient                       ← Create
6. PUT /Patient/patient/:patientId     ← Update by PatientID
7. PUT /Patient/archive/:patientId     ← Archive (soft delete) ✨ NEW
8. PUT /Patient/restore/:patientId     ← Restore (unarchive) ✨ NEW
9. DELETE /Patient/patient/:patientId  ← Delete (hard delete)
10. PUT /Patient/:id                   ← Generic (legacy)
11. DELETE /Patient/:id                ← Generic (legacy)
```

Always use `/Patient/patient/:patientId` routes for string PatientID operations. Specific routes MUST come before generic routes.

---

## Sample C# Facade Implementation

### Replacing Database Calls with API

**Before (Direct DB)**:
```csharp
public static Patient GetByPatientID(string patientId)
{
    using (var db = new ClinicDBEntities())
    {
        return db.Patients.FirstOrDefault(p => p.PatientID == patientId);
    }
}
```

**After (API)**:
```csharp
public static async Task<Patient> GetByPatientID(string patientId)
{
    using (var client = new HttpClient())
    {
        var response = await client.GetAsync(
            $"{ApiConfig.BaseUrl}/Patient/patient/{patientId}"
        );
        
        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;
            
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonConvert.DeserializeObject<Patient>(json);
    }
}
```

**GetAll with Enriched Data**:
```csharp
public static async Task<List<PatientViewModel>> GetAll()
{
    using (var client = new HttpClient())
    {
        var response = await client.GetAsync($"{ApiConfig.BaseUrl}/Patient");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        
        // API already returns joined data with FullName, Email, Phone
        return JsonConvert.DeserializeObject<List<PatientViewModel>>(json);
    }
}
```

**UpdatePatient (with User fields)**:
```csharp
public static async Task<bool> UpdatePatient(string patientId, Patient model)
{
    using (var client = new HttpClient())
    {
        var content = new StringContent(
            JsonConvert.SerializeObject(model),
            Encoding.UTF8,
            "application/json"
        );
        
        var response = await client.PutAsync(
            $"{ApiConfig.BaseUrl}/Patient/patient/{patientId}",
            content
        );
        
        return response.IsSuccessStatusCode;
    }
}
```

**DeletePatient**:
```csharp
public static async Task<bool> DeletePatient(string patientId)
{
    using (var client = new HttpClient())
    {
        var response = await client.DeleteAsync(
            $"{ApiConfig.BaseUrl}/Patient/patient/{patientId}"
        );
        
        return response.IsSuccessStatusCode;
    }
}
```

---

## Testing with cURL

### Test GetByPatientID
```bash
curl http://localhost:3000/Patient/patient/P12345
```

### Test GetAll
```bash
curl http://localhost:3000/Patient
```

### Test UpdatePatient
```bash
curl -X PUT http://localhost:3000/Patient/patient/P12345 \
  -H "Content-Type: application/json" \
  -d '{
    "Age": 36,
    "HomeAddress": "456 New St",
    "Email": "updated@example.com"
  }'
```

### Test DeletePatient
```bash
curl -X DELETE http://localhost:3000/Patient/patient/P12345
```

---

## Transaction Safety

The `PUT /Patient/patient/:patientId` endpoint uses transactions to ensure:
1. Patient table updates succeed
2. Users table updates succeed (if provided)
3. Both or neither - no partial updates

**Fields that update Users table**:
- `Email`
- `PhoneNumber`
- `FirstName`
- `MiddleName`
- `LastName`

All other fields update the Patient table only.

---

## Migration Tips

### Step 1: Test API Endpoints
```bash
# Test in your browser or Postman
GET http://localhost:3000/Patient
GET http://localhost:3000/Patient/patient/P12345
```

### Step 2: Update C# Forms

**frmPatient (List/View)**:
- Replace `PatientFacade.GetAll()` with API call
- Replace `PatientFacade.GetByPatientID()` with API call

**frmAEPatient (Add/Edit)**:
- Keep `AddPatientViaApiAsync()` for new patients
- Replace `PatientFacade.UpdatePatient()` with PUT to `/Patient/patient/:patientId`

### Step 3: Handle Contact/Family Info
Contact and family info can be loaded separately via their own endpoints (create those next if needed).

---

## Key Benefits

✅ **No C# Joins Required**: API returns FullName, Email, Phone pre-computed  
✅ **String PatientID Support**: Works with NVARCHAR(100) primary key  
✅ **User Data Updates**: Single endpoint updates both Patient and Users  
✅ **Transaction Safety**: All-or-nothing updates  
✅ **Backward Compatible**: Legacy routes still available
