import express from 'express';
import {
  importEmployees,
  importRegistrations,
  importAdmissions,
  importCollections,
  downloadTemplate,
} from '../controllers/importController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadWithErrorHandling } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

// Template downloads — GET /api/import/template/:resource
router.get('/template/:resource', downloadTemplate);

// Bulk imports — POST /api/import/:resource with multipart "file" field
router.post('/employees', uploadWithErrorHandling, importEmployees);
router.post('/registrations', uploadWithErrorHandling, importRegistrations);
router.post('/admissions', uploadWithErrorHandling, importAdmissions);
router.post('/collections', uploadWithErrorHandling, importCollections);

export default router;
