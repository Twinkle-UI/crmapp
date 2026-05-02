import express from "express";
import { z } from "zod";
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getAdmissionsForDropdown,
} from "../controllers/collectionController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

// Note: `team` is NOT in this schema — the controller derives it from the
// selected admission. Asking the user to pick the team would just be a chance
// to introduce mismatch with the admission's team.
const colSchema = z.object({
  admission: z.string().min(1, "Admission is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["cash", "upi", "card", "bank-transfer", "cheque"]),
  receiptNo: z.string().optional(),
  receivedOn: z.coerce.date().optional(),
  notes: z.string().optional(),
});

router.use(protect);
router.get("/admissions-list", getAdmissionsForDropdown);
router
  .route("/")
  .get(getCollections)
  .post(validate(colSchema), createCollection);
router
  .route("/:id")
  .put(updateCollection)
  .delete(authorize("admin"), deleteCollection);

export default router;
