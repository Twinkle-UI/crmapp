import express from 'express';
import { z } from 'zod';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  designation: z.string().optional(),
  team: z.string().min(1),
  joinedOn: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

router.use(protect);
router.route('/').get(getEmployees).post(validate(employeeSchema), createEmployee);
router.route('/:id').put(updateEmployee).delete(authorize('admin'), deleteEmployee);

export default router;
