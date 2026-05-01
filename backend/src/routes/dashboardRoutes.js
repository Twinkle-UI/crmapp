import express from 'express';
import { getDashboard, getActivityFeed } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/', getDashboard);
router.get('/activity', getActivityFeed);

export default router;
