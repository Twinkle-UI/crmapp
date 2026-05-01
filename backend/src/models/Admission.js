import mongoose from 'mongoose';
import {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from './Registration.js';

/**
 * An Admission is a confirmed registration — fee committed.
 * Mirrors the Registration shape (course/branch/entry type/university/counselor/date)
 * and adds Fee Amount which the rest of the dashboard depends on.
 *
 * Why mirror the registration fields here instead of just referencing the Registration:
 * Admissions are often created without a prior registration record (spot admissions,
 * walk-ins, bulk imports). Embedding the data keeps each admission self-contained
 * and queries fast (no JOIN overhead for dashboard aggregations).
 *
 * Money received is tracked separately in Collection (installments).
 */
const admissionSchema = new mongoose.Schema(
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

    feeAmount: { type: Number, required: true, default: 0 },

    // Optional link back to the originating registration when there was one
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },

    // Kept for downstream Collection / Team aggregations
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },

    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active',
    },

    // Backwards-compat alias — some old code paths still reference admittedOn
    // We keep it in sync with `date` so nothing breaks during the transition
    admittedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Keep admittedOn synced with date so old aggregations (dashboard) keep working
admissionSchema.pre('save', function (next) {
  if (this.isModified('date')) this.admittedOn = this.date;
  next();
});
// And on findOneAndUpdate flows
admissionSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update?.date) update.admittedOn = update.date;
  next();
});

admissionSchema.index({ date: -1 });
admissionSchema.index({ course: 1, branch: 1 });
admissionSchema.index({ counselorName: 1 });
admissionSchema.index({ name: 'text', counselorName: 'text', university: 'text' });

export default mongoose.model('Admission', admissionSchema);
