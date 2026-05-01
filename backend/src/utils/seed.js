import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Employee from '../models/Employee.js';
import Registration from '../models/Registration.js';
import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';
import Activity from '../models/Activity.js';

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDateInMonth = () => {
  const d = new Date();
  d.setDate(randomInt(1, Math.min(d.getDate(), 28)));
  return d;
};

const seed = async () => {
  await connectDB();

  console.log('🧹 Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Employee.deleteMany({}),
    Registration.deleteMany({}),
    Admission.deleteMany({}),
    Collection.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  console.log('👥 Creating system users...');
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@app.com',
    password: 'admin123',
    role: 'admin',
  });
  const staff = await User.create({
    name: 'Priya Sharma',
    email: 'priya@app.com',
    password: 'user123',
    role: 'user',
  });

  console.log('🏢 Creating teams...');
  const teamData = [
    { name: 'Sales A', description: 'North zone sales', monthlyTarget: 500000, color: '#6366f1' },
    { name: 'Sales B', description: 'South zone sales', monthlyTarget: 400000, color: '#10b981' },
    { name: 'Counsellors', description: 'Admission counselling', monthlyTarget: 300000, color: '#f59e0b' },
    { name: 'Support', description: 'Operations & support', monthlyTarget: 150000, color: '#a855f7' },
  ];
  const teams = await Team.insertMany(teamData);

  console.log('🧑‍💼 Creating employees...');
  const designations = ['Manager', 'Senior Executive', 'Executive', 'Counsellor', 'Coordinator'];
  const employees = [];
  // Create ~356 employees to match the sketch number
  for (let i = 1; i <= 356; i++) {
    employees.push({
      name: `Employee ${i}`,
      email: `emp${i}@app.com`,
      phone: `+91 9${String(800000000 + i).slice(0, 9)}`,
      designation: random(designations),
      team: random(teams)._id,
      status: i % 25 === 0 ? 'inactive' : 'active',
      joinedOn: new Date(Date.now() - randomInt(30, 800) * 24 * 60 * 60 * 1000),
    });
  }
  const savedEmployees = await Employee.insertMany(employees);

  console.log('📝 Creating registrations (this month)...');
  const COURSES = ['B.Tech', 'BBA', 'MBA', 'MCA', 'B.Sc', 'B.Com'];
  const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Finance', 'Marketing', 'General'];
  const ENTRY_TYPES = ['Spot Admission', 'Counseling', 'Online Form', 'Walk-in', 'Referral'];
  const UNIVERSITIES = ['Delhi University', 'Mumbai University', 'IGNOU', 'Pune University', 'Anna University', 'Amity University', 'Symbiosis'];
  const COUNSELLOR_NAMES = ['Priya Sharma', 'Rahul Verma', 'Anjali Mehta', 'Vikram Singh', 'Neha Kapoor', 'Arjun Nair'];

  const regs = [];
  // 27 registrations this month — to match sketch
  for (let i = 1; i <= 27; i++) {
    const team = random(teams);
    regs.push({
      name: `Prospect ${i}`,
      course: random(COURSES),
      branch: random(BRANCHES),
      entryType: random(ENTRY_TYPES),
      university: random(UNIVERSITIES),
      counselorName: random(COUNSELLOR_NAMES),
      date: randomDateInMonth(),
      phone: `+91 8${String(700000000 + i).slice(0, 9)}`,
      team: team._id,
      converted: i <= 13,
    });
  }
  await Registration.insertMany(regs);

  console.log('🎓 Creating admissions (this month)...');
  const admissions = [];
  // 47 admissions this month
  for (let i = 1; i <= 47; i++) {
    const team = random(teams);
    const fee = randomInt(15000, 80000);
    const date = randomDateInMonth();
    admissions.push({
      name: `Student ${i}`,
      course: random(COURSES),
      branch: random(BRANCHES),
      entryType: random(ENTRY_TYPES),
      university: random(UNIVERSITIES),
      counselorName: random(COUNSELLOR_NAMES),
      date,
      admittedOn: date, // mirror for legacy aggregations
      feeAmount: fee,
      team: team._id,
      status: 'active',
    });
  }
  const savedAdmissions = await Admission.insertMany(admissions);

  console.log('💰 Creating collections (this month)...');
  const methods = ['cash', 'upi', 'card', 'bank-transfer', 'cheque'];
  const collections = [];
  // Generate collections totalling roughly 5,00,000 to match the sketch's "50000 L" (5 lakh)
  let runningTotal = 0;
  const target = 500000;
  let receiptCounter = 1000;
  for (const adm of savedAdmissions) {
    if (runningTotal >= target) break;
    // 1-2 part payments per admission
    const parts = randomInt(1, 2);
    for (let p = 0; p < parts; p++) {
      const partAmount = Math.floor(adm.feeAmount / parts);
      collections.push({
        admission: adm._id,
        team: adm.team,
        amount: partAmount,
        method: random(methods),
        receivedOn: randomDateInMonth(),
        receiptNo: `RC${++receiptCounter}`,
      });
      runningTotal += partAmount;
    }
  }
  await Collection.insertMany(collections);

  console.log('📰 Creating activity log...');
  await Activity.insertMany([
    { user: admin._id, type: 'user_joined', message: 'Admin User joined the system' },
    { user: staff._id, type: 'team_created', message: 'Priya Sharma created team "Sales A"' },
    { user: staff._id, type: 'employee_added', message: 'Priya Sharma added employee "Employee 12"' },
    { user: staff._id, type: 'registration_added', message: 'Priya Sharma registered "Prospect 5"' },
    { user: admin._id, type: 'admission_added', message: 'Admin User admitted "Student 8" — fee ₹45000' },
    { user: staff._id, type: 'collection_received', message: 'Priya Sharma recorded collection ₹15000 (upi)' },
  ]);

  console.log('\n✅ Seed complete!');
  console.log('   Admin:  admin@app.com / admin123');
  console.log('   Staff:  priya@app.com / user123');
  console.log(`   Total collections recorded: ₹${runningTotal.toLocaleString('en-IN')}`);
  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
