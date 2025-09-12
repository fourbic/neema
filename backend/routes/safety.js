const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const { requireAuthAndLoadUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(requireAuthAndLoadUser);

// Safety Profile Routes
router.get('/profile', safetyController.getSafetyProfile);
router.put('/profile', safetyController.updateSafetyProfile);
router.post('/assess-risk', safetyController.assessRisk);

// Content Safety Routes
router.post('/analyze-content', safetyController.analyzeContent);
router.post('/generate-safe-alternative', safetyController.generateSafeAlternative);

// Incident Management Routes
router.post('/incidents', safetyController.reportIncident);
router.get('/incidents', safetyController.getIncidents);
router.put('/incidents/:incidentId/status', safetyController.updateIncidentStatus);

// Community Intelligence Routes
router.get('/threats/relevant', safetyController.getRelevantThreats);
router.get('/threats/trending', safetyController.getTrendingThreats);
router.get('/threats/stats', safetyController.getThreatStats);

// AI Safety Guidance Routes
router.post('/guidance', safetyController.getSafetyGuidance);
router.post('/emergency-guidance', safetyController.getEmergencyGuidance);

// Statistics and Analytics Routes
router.get('/stats', safetyController.getSafetyStats);

module.exports = router;
