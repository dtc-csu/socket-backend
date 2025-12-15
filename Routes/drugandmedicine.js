const express = require('express');
const router = express.Router();
const poolPromise = require('../db');
const generic = require('../Controllers/genericController')(poolPromise);

router.get('/', generic.getAll("DrugsAndMedicine", "DrugsAndMedicineId"));
router.post('/', generic.add("DrugsAndMedicine", "DrugsAndMedicineId"));
router.put('/:id', generic.edit("DrugsAndMedicine", "DrugsAndMedicineId"));
router.delete('/:id', generic.delete("DrugsAndMedicine", "DrugsAndMedicineId"));

module.exports = router;
