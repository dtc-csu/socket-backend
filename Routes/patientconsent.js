// routes/patientconsent.js
const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

// ----------------------------------------------------
// GET DETAILED PATIENT CONSENT REPORT BY PATIENT ID (with joins)
// ----------------------------------------------------
router.get('/report/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT TOP 1
          pc.ConsentID,
            pc.PatientID,
          pc.DoctorID,
          pc.PhysicianOfficeAddress,
          pc.PhysicianOfficeNo,
          pc.Remarks,
          pc.LastDentalVisit,
          pc.OralProphylaxisMaintenance,
          pc.IsInGoodHealth,
          pc.IsUnderMedicalTreatment,
          pc.MedicalTreatmentDetails,
          pc.HadSeriousIllnessOrSurgery,
          pc.SeriousIllnessOrSurgeryDetails,
          pc.EverHospitalized,
          pc.HospitalizedDetails,
          pc.TakingPrescriptionMedication,
          pc.PrescriptionMedicationDetails,
          pc.UsesTobaccoProducts,
          pc.UsesAlcoholOrDrugs,
          pc.AllergicToOthers,
          pc.HaveanyoftheFollowing,
          pc.AllergicToLocalAnesthetic,
          pc.AllergicToPenicillin,
          pc.AllergicToSulfa,
          pc.AllergicToAspirin,
          pc.AllergicToLatex,
          pc.AllergicToOther,
          pc.IsPregnant,
          pc.IsNursing,
          pc.TakingBirthControlPills,
          pc.BleedingTime,
          pc.BloodType,
          pc.BloodPressure,
          pc.Condition_HighBloodPressure,
          pc.Condition_LowBloodPressure,
          pc.Condition_EpilepsyConvulsion,
          pc.Condition_AidsHIV,
          pc.Condition_SexuallyTransmittedDisease,
          pc.Condition_StomachTroublesUlcers,
          pc.Condition_FaintingSeizure,
          pc.Condition_RapidWeightLoss,
          pc.Condition_RadiationTherapy,
          pc.Condition_JointReplacementImplant,
          pc.Condition_HeartSurgery,
          pc.Condition_HeartAttack,
          pc.Condition_ThyroidProblem,
          pc.Condition_Stroke,
          pc.Condition_HeartDisease,
          pc.Condition_CancerTumors,
          pc.Condition_HeartMurmur,
          pc.Condition_Anemia,
          pc.Condition_Angina,
          pc.Condition_HepatitisLiverDisease,
          pc.Condition_RheumaticFever,
          pc.Condition_Asthma,
          pc.Condition_HayFeverAllergies,
          pc.Condition_Emphysema,
          pc.Condition_RespiratoryProblems,
          pc.Condition_BleedingProblems,
          pc.Condition_HepatitisJaundice,
          pc.Condition_BloodDiseases,
          pc.Condition_Tuberculosis,
          pc.Condition_HeadInjuries,
          pc.Condition_SwollenAnkles,
          pc.Condition_ArthritisRheumatism,
          pc.Condition_KidneyDisease,
          pc.Condition_Diabetes,
          pc.Condition_ChestPain,
          pc.Condition_Other,
          pc.Condition_OtherDetails,
          pc.CreatedAt,
          -- Patient fields
          p.BirthDate,
          p.Sex,
          p.Religion,
          p.Nationality,
          p.NickName,
          p.HomeAddress,
          p.HomeNo,
          p.Occupation,
          p.OfficeNo,
          p.Age,
          -- User fields
          u.FirstName,
          u.MiddleName,
          u.LastName,
          u.Email,
          u.PhoneNumber,
          -- ContactPerson fields
          cp.ContactPersonName,
          cp.ContactPersonContactNo,
          cp.ContactPersonOccupation,
          -- Doctor fields
          d.Specialty,
          du.FirstName AS DoctorFirstName,
          du.MiddleName AS DoctorMiddleName,
          du.LastName AS DoctorLastName
        FROM PatientConsent pc
        LEFT JOIN Patient p ON pc.PatientID = p.PatientID
        LEFT JOIN Users u ON p.UserID = u.UserID
        LEFT JOIN ContactPerson cp ON p.UserID = cp.UserID
        LEFT JOIN Doctors d ON pc.DoctorID = d.DoctorID
        LEFT JOIN Users du ON d.UserID = du.UserID
        WHERE pc.PatientID = @patientId
        ORDER BY pc.CreatedAt DESC
      `);
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Patient consent report not found' });
    }
    // Optionally, transform/split birthdate and combine doctor/patient names here
    return res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching patient consent report:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});
// GENERIC CRUD ROUTES FOR PatientConsent
// ----------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`SELECT * FROM PatientConsent ORDER BY CreatedAt DESC`);
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ConsentID is identity/auto-increment, do not include in add
router.post('/', async (req, res) => {
  if ('ConsentID' in req.body) {
    delete req.body.ConsentID;
  }
  return generic.add("PatientConsent", "ConsentID")(req, res);
});        // Add patient consent
router.put('/:id', generic.edit("PatientConsent", "ConsentID"));     // Update patient consent
router.delete('/:id', generic.delete("PatientConsent", "ConsentID"));// Delete patient consent

// ----------------------------------------------------
// GET PATIENT CONSENT BY PATIENT ID
// ----------------------------------------------------
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('patientId', patientId)
      .query(`
        SELECT *
        FROM PatientConsent
        WHERE PatientID = @patientId
        ORDER BY CreatedAt DESC
      `);

    return res.json(result.recordset);

  } catch (err) {
    console.error("Error fetching patient consent:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// ----------------------------------------------------
// GET PATIENT CONSENT BY ID
// ----------------------------------------------------
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const pool = await poolPromise;

    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT *
        FROM PatientConsent
        WHERE ConsentID = @id
      `);

    if (result.recordset.length > 0) {
      return res.json(result.recordset[0]);
    } else {
      return res.status(404).json({ success: false, message: 'Patient consent not found' });
    }

  } catch (err) {
    console.error("Error fetching patient consent:", err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
