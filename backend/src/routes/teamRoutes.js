import express from 'express';
import { z } from 'zod';
import {
  getTeams, createTeam, updateTeam, deleteTeam,
} from '../controllers/teamController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const teamSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  monthlyTarget: z.number().nonnegative().optional(),
  color: z.string().optional(),
});

router.use(protect);
router.route('/').get(getTeams).post(authorize('admin'), validate(teamSchema), createTeam);
router.route('/:id').put(authorize('admin'), updateTeam).delete(authorize('admin'), deleteTeam);

export default router;
