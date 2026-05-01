import express from 'express';
import { z } from 'zod';
import {
  getCollections, createCollection, deleteCollection,
} from '../controllers/collectionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const colSchema = z.object({
  admission: z.string().min(1),
  team: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(['cash', 'upi', 'card', 'bank-transfer', 'cheque']).optional(),
  receivedBy: z.string().optional(),
  receivedOn: z.string().optional(),
  receiptNo: z.string().optional(),
  notes: z.string().optional(),
});

router.use(protect);
router.route('/').get(getCollections).post(validate(colSchema), createCollection);
router.route('/:id').delete(authorize('admin'), deleteCollection);

export default router;
