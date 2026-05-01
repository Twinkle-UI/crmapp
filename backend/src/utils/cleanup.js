import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Registration from '../models/Registration.js';
import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';
import Activity from '../models/Activity.js';

/**
 * Cleanup script — removes demo/seed data so the client starts with empty
 * Registrations / Admissions / Collections tables.
 *
 * What's deleted:
 *   - All registrations
 *   - All admissions
 *   - All collections (payments)
 *   - All activity log entries
 *
 * What's KEPT (so the app keeps working):
 *   - Users (login accounts — admin@app.com etc)
 *   - Teams (so client can immediately add data with existing teams)
 *   - Employees (so "Total Employees" KPI shows a real number)
 *
 * Run with:  npm run cleanup
 *
 * To wipe employees too (if Total Employees should be 0), open MongoDB Compass
 * and delete the `employees` collection manually, or run:
 *   db.employees.deleteMany({})
 */
const cleanup = async () => {
  await connectDB();

  console.log('🧹 Cleaning demo data (keeping users, teams, employees)...\n');

  const [regs, adms, cols, acts] = await Promise.all([
    Registration.deleteMany({}),
    Admission.deleteMany({}),
    Collection.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  console.log(`   ✓ Removed ${regs.deletedCount} registrations`);
  console.log(`   ✓ Removed ${adms.deletedCount} admissions`);
  console.log(`   ✓ Removed ${cols.deletedCount} collections`);
  console.log(`   ✓ Removed ${acts.deletedCount} activity log entries`);

  console.log('\n✅ Cleanup complete!');
  console.log('   Login still works (admin@app.com / admin123)');
  console.log('   Teams and Employees are preserved');
  console.log('   Dashboard pages are now empty — ready for client data\n');

  await mongoose.disconnect();
  process.exit(0);
};

cleanup().catch((err) => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
