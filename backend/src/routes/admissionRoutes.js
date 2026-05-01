import express from 'express';
import { z } from 'zod';
import {
  getAdmissions,
  createAdmission,
  updateAdmission,
  deleteAdmission,
} from '../controllers/admissionController.js';
import {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from '../models/Registration.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const admSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  course: z.enum(COURSE_OPTIONS, { errorMap: () => ({ message: 'Invalid course' }) }),
  branch: z.enum(BRANCH_OPTIONS, { errorMap: () => ({ message: 'Invalid branch' }) }),
  entryType: z.enum(ENTRY_TYPE_OPTIONS, { errorMap: () => ({ message: 'Invalid entry type' }) }),
  university: z.string().min(2, 'University is required'),
  counselorName: z.string().min(2, 'Counselor name is required'),
  date: z.coerce.date().optional(),
  feeAmount: z.coerce.number().nonnegative('Fee must be 0 or more'),
  registration: z.string().optional(),
  team: z.string().optional(),
  status: z.enum(['active', 'completed', 'dropped']).optional(),
});

router.use(protect);
router.route('/').get(getAdmissions).post(validate(admSchema), createAdmission);
router.route('/:id').put(updateAdmission).delete(authorize('admin'), deleteAdmission);

export default router;
