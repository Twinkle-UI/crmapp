import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Registration from "../models/Registration.js";
import Admission from "../models/Admission.js";
import Collection from "../models/Collection.js";
import Employee from "../models/Employee.js";
import Activity from "../models/Activity.js";

/**
 * Cleanup script — wipes all client-facing data so the client starts fresh.
 *
 * What gets deleted:
 *   - All registrations
 *   - All admissions
 *   - All collections (payments)
 *   - All employees   ← so "Total Employees" KPI shows 0
 *   - All activity log entries
 *
 * What's KEPT (so the app keeps working):
 *   - Users (login accounts — admin@app.com etc)
 *   - Teams (so client can immediately use existing team structure)
 *
 * Run with:  npm run cleanup
 *
 * To wipe Teams too, open MongoDB Compass and delete `teams` collection
 * manually, OR run in Compass shell:
 *   db.teams.deleteMany({})
 */
const cleanup = async () => {
  await connectDB();

  console.log("🧹 Cleaning all client data (keeping users + teams only)...\n");

  // Run all deletes in parallel — they don't depend on each other
  const [regs, adms, cols, emps, acts] = await Promise.all([
    Registration.deleteMany({}),
    Admission.deleteMany({}),
    Collection.deleteMany({}),
    Employee.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  console.log(`   ✓ Removed ${regs.deletedCount} registrations`);
  console.log(`   ✓ Removed ${adms.deletedCount} admissions`);
  console.log(`   ✓ Removed ${cols.deletedCount} collections`);
  console.log(`   ✓ Removed ${emps.deletedCount} employees`);
  console.log(`   ✓ Removed ${acts.deletedCount} activity log entries`);

  console.log("\n✅ Cleanup complete!");
  console.log("   ─ Login still works (your admin account is preserved)");
  console.log("   ─ Teams are preserved (so client can immediately add data)");
  console.log("   ─ All KPIs will show 0 — ready for real client data\n");

  await mongoose.disconnect();
  process.exit(0);
};

cleanup().catch((err) => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
