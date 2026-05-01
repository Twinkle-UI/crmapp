import mongoose from 'mongoose';

/**
 * A Registration captures a student's enrollment intent for a specific
 * Course + Branch at a University, with the EntryType (how they came in)
 * and which counselor handled them.
 *
 * Once converted (paid/confirmed), an Admission record is created.
 */

// Predefined options — kept here as the single source of truth so backend validation
// and frontend dropdowns can both reference them. Adding a new course is one-line change.
export const COURSE_OPTIONS = [
  'B.Tech',
  'BBA',
  'MBA',
  'MCA',
  'B.Sc',
  'M.Sc',
  'B.Com',
  'BA',
  'MA',
  'Diploma',
  'PhD',
  'Other',
];

export const BRANCH_OPTIONS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemical',
  'Finance',
  'Marketing',
  'HR',
  'Operations',
  'General',
  'Other',
];

export const ENTRY_TYPE_OPTIONS = [
  'Spot Admission',
  'Counseling',
  'Online Form',
  'Walk-in',
  'Referral',
  'Campus Visit',
  'Other',
];

const registrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    course: { type: String, required: true, enum: COURSE_OPTIONS },
    branch: { type: String, required: true, enum: BRANCH_OPTIONS },
    entryType: {
      type: String,
      required: true,
      enum: ENTRY_TYPE_OPTIONS,
      default: 'Counseling',
    },
    university: { type: String, required: true, trim: true },
    counselorName: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },

    // Optional contact info — useful but not required
    phone: { type: String, default: '', trim: true },

    // Kept for downstream Admission / Team aggregations
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    converted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

registrationSchema.index({ date: -1 });
registrationSchema.index({ course: 1, branch: 1 });
registrationSchema.index({ counselorName: 1 });
registrationSchema.index({ name: 'text', counselorName: 'text', university: 'text' });

export default mongoose.model('Registration', registrationSchema);
