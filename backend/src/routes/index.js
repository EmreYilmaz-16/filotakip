const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const vehicleRoutes = require('./vehicles');
const driverRoutes = require('./drivers');
const assignmentRoutes = require('./assignments');
const fuelRoutes = require('./fuel');
const kmRoutes = require('./km');
const maintenanceRoutes = require('./maintenance');
const faultRoutes = require('./faults');
const documentRoutes = require('./documents');
const reportRoutes = require('./reports');
const userRoutes = require('./users');
const tripRoutes = require('./trips');
const driverDocRoutes = require('./driver-documents');
const vehicleTaxRoutes = require('./vehicle-taxes');

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/fuel', fuelRoutes);
router.use('/km', kmRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/faults', faultRoutes);
router.use('/documents', documentRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/trips', tripRoutes);
router.use('/driver-documents', driverDocRoutes);
router.use('/vehicle-taxes', vehicleTaxRoutes);

module.exports = router;
