# Appointment API Endpoints

## Flutter Method → API Endpoint Mapping

### 1. GetAppointmentsByDate(DateTime appointmentDate)
**Endpoint**: `GET /Appointments/date/:date`

**Usage**:
```dart
// Flutter
final appointments = await getAppointmentsByDate(DateTime(2026, 3, 15));

// API Call
GET http://localhost:3000/Appointments/date/2026-03-15
```

**Response**:
```json
[
  {
    "AppointmentID": 10,
    "PatientID": "P001",
    "AppointmentDate": "2026-03-15T10:00:00",
    "Status": "Pending",
    "ChiefComplaint": "Checkup",
    "CreatedAt": "2026-03-01T08:00:00"
  }
]
```

---

### 2. GetAllActive()
**Endpoint**: `GET /Appointments/active/list`

**Usage**:
```dart
// Flutter
final activeAppointments = await getAllActive();

// API Call
GET http://localhost:3000/Appointments/active/list
```

**Response**:
```json
[
  {
    "AppointmentID": 5,
    "PatientID": "P001",
    "Status": "Pending",
    "AppointmentDate": "2026-03-20T10:00:00",
    ...
  },
  {
    "AppointmentID": 12,
    "PatientID": "P003",
    "Status": "Confirmed",
    "AppointmentDate": "2026-03-21T14:30:00",
    ...
  }
]
```

**Note**: Returns appointments where Status is NOT 'Cancelled', 'Completed', or 'Rejected'

---

### 3. GetById(int appointmentId)
**Endpoint**: `GET /Appointments/:appointmentId`

**Usage**:
```dart
// Flutter
final appointment = await getById(123);

// API Call
GET http://localhost:3000/Appointments/123
```

**Response**:
```json
{
  "AppointmentID": 123,
  "PatientID": "P001",
  "DoctorID": 5,
  "PatientName": "John Doe",
  "AppointmentDate": "2026-03-15T10:00:00",
  "Status": "Pending",
  "CreatedAt": "2026-03-01T08:00:00",
  "ChiefComplaint": "Annual checkup"
}
```

**Error Response** (404):
```json
{
  "error": "Appointment not found"
}
```

---

### 4. PatientHasAppointment(string patientId, DateTime appointmentDate)
**Endpoint**: `GET /Appointments/check/:patientId/:date`

**Usage**:
```dart
// Flutter
final result = await patientHasAppointment("P001", DateTime(2026, 3, 15));
final hasAppointment = result['hasAppointment'];

// API Call
GET http://localhost:3000/Appointments/check/P001/2026-03-15
```

**Response**:
```json
{
  "hasAppointment": true,
  "count": 1
}
```

**Note**: Only counts appointments that are NOT 'Cancelled' or 'Rejected'

---

## Additional Useful Endpoints

### Get Appointments by Patient
```
GET /Appointments/patient/:patientId
```

### Create Appointment
```
POST /Appointments
Body: {
  "patientId": "P001",
  "appointmentDate": "2026-03-15T10:00:00",
  "status": "Pending",
  "chiefComplaint": "Checkup"
}
```

### Update Appointment
```
PUT /Appointments/:appointmentId
Body: {
  "status": "Confirmed",
  "AppointmentDate": "2026-03-15T10:00:00"
}
```

### Delete Appointment
```
DELETE /Appointments/:appointmentId
```

### Search/Filter Appointments
```
GET /Appointments/search/filter?status=Pending&patientId=P001&startDate=2026-03-01&endDate=2026-03-31
```

---

## Sample Flutter Service Implementation

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class AppointmentService {
  static const String baseUrl = 'http://localhost:3000/Appointments';

  // 1. Get appointments by date
  static Future<List<dynamic>> getAppointmentsByDate(DateTime date) async {
    final dateStr = date.toIso8601String().split('T')[0]; // 2026-03-15
    final response = await http.get(Uri.parse('$baseUrl/date/$dateStr'));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load appointments');
  }

  // 2. Get all active appointments
  static Future<List<dynamic>> getAllActive() async {
    final response = await http.get(Uri.parse('$baseUrl/active/list'));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to load active appointments');
  }

  // 3. Get appointment by ID
  static Future<Map<String, dynamic>> getById(int appointmentId) async {
    final response = await http.get(Uri.parse('$baseUrl/$appointmentId'));
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else if (response.statusCode == 404) {
      throw Exception('Appointment not found');
    }
    throw Exception('Failed to load appointment');
  }

  // 4. Check if patient has appointment
  static Future<Map<String, dynamic>> patientHasAppointment(
    String patientId, 
    DateTime date
  ) async {
    final dateStr = date.toIso8601String().split('T')[0];
    final response = await http.get(
      Uri.parse('$baseUrl/check/$patientId/$dateStr')
    );
    
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to check appointment');
  }
}
```

---

## Testing with cURL

### Test GetAppointmentsByDate
```bash
curl http://localhost:3000/Appointments/date/2026-03-15
```

### Test GetAllActive
```bash
curl http://localhost:3000/Appointments/active/list
```

### Test GetById
```bash
curl http://localhost:3000/Appointments/123
```

### Test PatientHasAppointment
```bash
curl http://localhost:3000/Appointments/check/P001/2026-03-15
```

---

## Route Order (Important!)

Routes are evaluated in order, so specific routes must come BEFORE generic routes:

```javascript
✅ Correct Order:
1. /Appointments/date/:date
2. /Appointments/active/list
3. /Appointments/check/:patientId/:date
4. /Appointments/:appointmentId  ← Generic, comes last

❌ Wrong Order:
1. /Appointments/:appointmentId  ← Would catch everything!
2. /Appointments/date/:date      ← Never reached
```

The file is already ordered correctly in `appointments.js`.
