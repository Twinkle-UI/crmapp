import mongoose from "mongoose";

/**
 * Activity log — every meaningful user action gets recorded here.
 * Powers the "Recent Activity" feed on the dashboard.
 *
 * The `type` enum is the authoritative list of trackable events.
 * When adding a new event type elsewhere in the app, add it here first
 * or you'll get the "not a valid enum value" error at validation time.
 */
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        // Registration events
        "registration_added",
        "registration_updated",
        "registration_deleted",
        "registration_converted",

        // Admission events
        "admission_added",
        "admission_updated",
        "admission_deleted",

        // Collection / payment events
        "collection_added",
        "collection_updated",
        "collection_deleted",

        // Team / employee events
        "team_added",
        "team_updated",
        "team_deleted",
        "employee_added",
        "employee_updated",
        "employee_deleted",

        // Bulk import events
        "bulk_import",
      ],
    },
    message: { type: String, required: true },
    // Free-form metadata (e.g. { admissionId, amount, etc. }) — not validated,
    // intentionally flexible because each event type carries different data.
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
