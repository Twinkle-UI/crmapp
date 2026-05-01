import mongoose from 'mongoose';

/**
 * Employees are the staff members tracked by the client.
 * Each employee belongs to a team. They are NOT system login users
 * (those live in the User model).
 */
const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: '' },
    phone: { type: String, default: '' },
    designation: { type: String, default: '' },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    joinedOn: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

employeeSchema.index({ team: 1, status: 1 });

export default mongoose.model('Employee', employeeSchema);
