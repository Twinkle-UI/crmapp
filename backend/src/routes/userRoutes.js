import express from "express";
import { z } from "zod";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "user"]).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")), // allow empty = no change
  role: z.enum(["admin", "user"]).optional(),
});

router.use(protect);

// All user-management routes are admin-only
router.get("/", authorize("admin"), getUsers);
router.post("/", authorize("admin"), validate(createUserSchema), createUser);
router.put("/:id", authorize("admin"), validate(updateUserSchema), updateUser);
router.delete("/:id", authorize("admin"), deleteUser);

export default router;
