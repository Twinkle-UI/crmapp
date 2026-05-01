import express from 'express';
import { z } from 'zod';
import {
  getRegistrations,
  getRegistrationOptions,
  createRegistration,
  updateRegistration,
  deleteRegistration,
} from '../controllers/registrationController.js';
import {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from '../models/Registration.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Use z.enum but coerce the array to a tuple — Zod requires a const tuple
const regSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  course: z.enum(COURSE_OPTIONS, { errorMap: () => ({ message: 'Invalid course' }) }),
  branch: z.enum(BRANCH_OPTIONS, { errorMap: () => ({ message: 'Invalid branch' }) }),
  entryType: z.enum(ENTRY_TYPE_OPTIONS, { errorMap: () => ({ message: 'Invalid entry type' }) }),
  university: z.string().min(2, 'University is required'),
  counselorName: z.string().min(2, 'Counselor name is required'),
  date: z.coerce.date().optional(),
  phone: z.string().optional(),
  team: z.string().optional(),
});

router.use(protect);

// Options endpoint for frontend dropdowns — no auth-leak risk so just lists
router.get('/options', getRegistrationOptions);

router.route('/').get(getRegistrations).post(validate(regSchema), createRegistration);
router.route('/:id').put(updateRegistration).delete(authorize('admin'), deleteRegistration);

export default router;
