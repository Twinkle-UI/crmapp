import mongoose from 'mongoose';

/**
 * Collection = money actually received against an Admission.
 * One admission can have many collections (installments).
 */
const collectionSchema = new mongoose.Schema(
  {
    admission: { type: mongoose.Schema.Types.ObjectId, ref: 'Admission', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank-transfer', 'cheque'],
      default: 'cash',
    },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    receivedOn: { type: Date, default: Date.now },
    receiptNo: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

collectionSchema.index({ team: 1, receivedOn: -1 });
collectionSchema.index({ admission: 1 });

export default mongoose.model('Collection', collectionSchema);
