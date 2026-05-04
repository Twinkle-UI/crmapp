import mongoose from "mongoose";

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

        // User management events
        "user_added",
        "user_updated",
        "user_deleted",

        // Bulk import events
        "bulk_import",
      ],
    },
    message: { type: String, required: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Activity", activitySchema);
