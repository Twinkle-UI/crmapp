import mongoose from 'mongoose';

/**
 * Teams group employees and let us aggregate revenue / performance per team.
 * Client creates teams freely (e.g. "Sales A", "North Region", "Counsellors").
 */
const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    monthlyTarget: { type: Number, default: 0 }, // revenue target for this team
    color: { type: String, default: '#6366f1' }, // for chart legend
  },
  { timestamps: true }
);

export default mongoose.model('Team', teamSchema);
