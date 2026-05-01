import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import Employee from '../models/Employee.js';
import Registration, {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from '../models/Registration.js';
import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';
import Team from '../models/Team.js';
import Activity from '../models/Activity.js';

import {
  parseSpreadsheet,
  generateTemplate,
  buildHeaderMap,
  remapRow,
} from '../utils/spreadsheetParser.js';

/**
 * BULK IMPORT — design notes
 * --------------------------
 * Each importable resource has a "spec" that captures three things:
 *   1. headerMap     — variants of column names → canonical field names
 *   2. zod schema    — per-row validation
 *   3. transform()   — converts a validated row into the shape Mongoose expects
 *                      (e.g. resolves team NAME → team _id by lookup)
 *
 * The flow:
 *   1. Parse the uploaded file → array of raw rows
 *   2. Remap headers using headerMap
 *   3. For each row: zod validate → transform → push to either successes or errors
 *   4. insertMany({ ordered: false }) on successes — ordered:false means one bad row
 *      doesn't abort the rest (defense in depth; we already validated)
 *   5. Return { inserted, failed, errors: [{ row, message }] }
 *
 * Why row-level errors instead of fail-fast: clients with messy CSVs (typos,
 * missing teams, dupes) want to fix what they can without having to re-upload
 * 500 rows.
 */

// ---------------------------------------------------------------------------
// Field maps — keep header variants generous so clients can use loose naming
// ---------------------------------------------------------------------------

const COMMON_TEAM_HEADERS = ['Team', 'team', 'Team Name', 'TeamName', 'Department'];

const employeeHeaderMap = buildHeaderMap({
  name: ['Name', 'Full Name', 'Employee Name', 'Staff Name'],
  email: ['Email', 'Email Address', 'Mail'],
  phone: ['Phone', 'Mobile', 'Contact', 'Phone Number'],
  designation: ['Designation', 'Role', 'Title', 'Position'],
  team: COMMON_TEAM_HEADERS,
  joinedOn: ['Joined On', 'Join Date', 'Joining Date', 'Date'],
});

const registrationHeaderMap = buildHeaderMap({
  name: ['Name', 'Student Name', 'Full Name'],
  course: ['Course', 'Program'],
  branch: ['Branch', 'Specialization', 'Stream'],
  entryType: ['Entry Type', 'EntryType', 'Mode', 'Type'],
  university: ['University', 'College', 'Institute'],
  counselorName: ['Counselor', 'Counsellor', 'Counselor Name', 'Counsellor Name', 'Handled By'],
  date: ['Date', 'Registration Date', 'Reg Date'],
  phone: ['Phone', 'Mobile', 'Contact'],
});

const admissionHeaderMap = buildHeaderMap({
  name: ['Name', 'Student Name', 'Customer Name'],
  course: ['Course', 'Program'],
  branch: ['Branch', 'Specialization', 'Stream'],
  entryType: ['Entry Type', 'EntryType', 'Mode', 'Type'],
  university: ['University', 'College', 'Institute'],
  counselorName: ['Counselor', 'Counsellor', 'Counselor Name', 'Counsellor Name', 'Handled By'],
  date: ['Date', 'Admitted On', 'Admission Date'],
  feeAmount: ['Fee', 'Fee Amount', 'Amount', 'Total Fee'],
});

const collectionHeaderMap = buildHeaderMap({
  admissionName: ['Admission', 'Student Name', 'Customer Name', 'Name'],
  amount: ['Amount', 'Paid', 'Collection'],
  method: ['Method', 'Payment Method', 'Mode'],
  receiptNo: ['Receipt', 'Receipt No', 'Receipt Number'],
  receivedOn: ['Received On', 'Date', 'Payment Date'],
  notes: ['Notes', 'Remarks'],
});

// ---------------------------------------------------------------------------
// Per-row schemas
// ---------------------------------------------------------------------------

const employeeRowSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  designation: z.string().optional(),
  team: z.string().min(1, 'Team is required'),
  joinedOn: z.string().optional(),
});

const registrationRowSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  course: z.string().min(1, 'Course is required'),
  branch: z.string().min(1, 'Branch is required'),
  entryType: z.string().optional(),
  university: z.string().min(1, 'University is required'),
  counselorName: z.string().min(1, 'Counselor name is required'),
  date: z.string().optional(),
  phone: z.string().optional(),
});

const admissionRowSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  course: z.string().min(1, 'Course is required'),
  branch: z.string().min(1, 'Branch is required'),
  entryType: z.string().optional(),
  university: z.string().min(1, 'University is required'),
  counselorName: z.string().min(1, 'Counselor name is required'),
  date: z.string().optional(),
  feeAmount: z.coerce.number().nonnegative('Fee must be 0 or more'),
});

const collectionRowSchema = z.object({
  admissionName: z.string().min(1, 'Admission name is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.string().optional(),
  receiptNo: z.string().optional(),
  receivedOn: z.string().optional(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Helper — coerce a date-ish string to Date or undefined.
// SheetJS gives us either a Date object (when cellDates:true and cell was a date)
// or a string. We accept both.
// ---------------------------------------------------------------------------

const toDate = (v) => {
  if (!v) return undefined;
  if (v instanceof Date && !isNaN(v)) return v;
  const d = new Date(v);
  return isNaN(d) ? undefined : d;
};

const VALID_SOURCES = new Set(['walk-in', 'website', 'referral', 'social', 'other']);
const VALID_METHODS = new Set(['cash', 'upi', 'card', 'bank-transfer', 'cheque']);

/**
 * Fuzzy match a string against an array of allowed values.
 * Returns the canonical value or null. Case-insensitive, ignores spaces/dots.
 *   matchEnum('btech', ['B.Tech']) → 'B.Tech'
 *   matchEnum('computer science', ['Computer Science']) → 'Computer Science'
 */
const matchEnum = (input, allowed) => {
  if (!input) return null;
  const norm = String(input).toLowerCase().replace(/[\s.\-_]/g, '');
  for (const a of allowed) {
    if (String(a).toLowerCase().replace(/[\s.\-_]/g, '') === norm) return a;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Generic processor — takes the file, the spec, and runs the import.
// Returns the standard import response.
// ---------------------------------------------------------------------------

const runImport = async ({ buffer, headerMap, schema, transform, model, req }) => {
  // 1. Parse file
  let parsed;
  try {
    parsed = parseSpreadsheet(buffer);
  } catch (err) {
    return { status: 400, body: { success: false, message: err.message } };
  }

  // 2. Build context (e.g. preload teams once for name → id resolution)
  const teams = await Team.find().lean();
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));

  // 3. Iterate rows
  const errors = [];
  const validDocs = [];

  parsed.rows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // +2 because row 1 is headers and arrays are 0-indexed
    const remapped = remapRow(rawRow, headerMap);

    // Validate
    const result = schema.safeParse(remapped);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const messages = Object.entries(flat)
        .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
        .join('; ');
      errors.push({ row: rowNum, message: messages || 'Invalid row' });
      return;
    }

    // Transform — may also reject (e.g. team not found). Returns either a doc or an error string.
    try {
      const doc = transform(result.data, { teamByName });
      if (typeof doc === 'string') {
        errors.push({ row: rowNum, message: doc });
        return;
      }
      validDocs.push(doc);
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
    }
  });

  // 4. Bulk insert
  let inserted = 0;
  if (validDocs.length > 0) {
    try {
      const result = await model.insertMany(validDocs, { ordered: false });
      inserted = result.length;
    } catch (err) {
      // ordered:false means partial success on duplicate-key etc.
      // err.insertedDocs contains what made it through.
      inserted = err.insertedDocs?.length || 0;
      if (err.writeErrors) {
        for (const we of err.writeErrors) {
          // Map writeError back to original row number is tricky because validDocs
          // index ≠ original row index. Best-effort message:
          errors.push({
            row: '—',
            message: we.errmsg || 'Database write error',
          });
        }
      }
    }
  }

  // 5. Activity log
  if (inserted > 0 && req?.user) {
    await Activity.create({
      user: req.user._id,
      type: 'employee_added', // generic — used for all bulk imports
      message: `${req.user.name} bulk-imported ${inserted} ${model.modelName.toLowerCase()} record${inserted > 1 ? 's' : ''}`,
      meta: { count: inserted, failed: errors.length },
    }).catch(() => {}); // non-fatal
  }

  return {
    status: 200,
    body: {
      success: true,
      data: {
        totalRows: parsed.rows.length,
        inserted,
        failed: errors.length,
        errors: errors.slice(0, 100), // cap to keep response sane
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Per-resource controllers — each just supplies its spec and calls runImport.
// ---------------------------------------------------------------------------

export const importEmployees = asyncHandler(async (req, res) => {
  const result = await runImport({
    buffer: req.file.buffer,
    headerMap: employeeHeaderMap,
    schema: employeeRowSchema,
    model: Employee,
    req,
    transform: (row, { teamByName }) => {
      const team = teamByName.get(row.team.toLowerCase().trim());
      if (!team) return `Team "${row.team}" not found — create it first or check spelling`;
      return {
        name: row.name,
        email: row.email || '',
        phone: row.phone || '',
        designation: row.designation || '',
        team: team._id,
        joinedOn: toDate(row.joinedOn) || new Date(),
        status: 'active',
      };
    },
  });
  res.status(result.status).json(result.body);
});

export const importRegistrations = asyncHandler(async (req, res) => {
  const result = await runImport({
    buffer: req.file.buffer,
    headerMap: registrationHeaderMap,
    schema: registrationRowSchema,
    model: Registration,
    req,
    transform: (row) => {
      const course = matchEnum(row.course, COURSE_OPTIONS);
      if (!course) return `Course "${row.course}" not valid (allowed: ${COURSE_OPTIONS.join(', ')})`;

      const branch = matchEnum(row.branch, BRANCH_OPTIONS);
      if (!branch) return `Branch "${row.branch}" not valid`;

      const entryType = row.entryType
        ? matchEnum(row.entryType, ENTRY_TYPE_OPTIONS) || 'Other'
        : 'Counseling';

      return {
        name: row.name,
        course,
        branch,
        entryType,
        university: row.university,
        counselorName: row.counselorName,
        date: toDate(row.date) || new Date(),
        phone: row.phone || '',
      };
    },
  });
  res.status(result.status).json(result.body);
});

export const importAdmissions = asyncHandler(async (req, res) => {
  const result = await runImport({
    buffer: req.file.buffer,
    headerMap: admissionHeaderMap,
    schema: admissionRowSchema,
    model: Admission,
    req,
    transform: (row) => {
      const course = matchEnum(row.course, COURSE_OPTIONS);
      if (!course) return `Course "${row.course}" not valid (allowed: ${COURSE_OPTIONS.join(', ')})`;

      const branch = matchEnum(row.branch, BRANCH_OPTIONS);
      if (!branch) return `Branch "${row.branch}" not valid`;

      const entryType = row.entryType
        ? matchEnum(row.entryType, ENTRY_TYPE_OPTIONS) || 'Other'
        : 'Counseling';

      const date = toDate(row.date) || new Date();

      return {
        name: row.name,
        course,
        branch,
        entryType,
        university: row.university,
        counselorName: row.counselorName,
        date,
        admittedOn: date, // mirror for legacy aggregations
        feeAmount: row.feeAmount,
        status: 'active',
      };
    },
  });
  res.status(result.status).json(result.body);
});

/**
 * Collections import is special — it needs to look up the parent Admission by
 * student/customer name. We pre-build a map of all admissions so each row is
 * O(1). If multiple admissions share a name, we pick the most recent
 * (by admittedOn desc) and surface a soft warning in the row error.
 */
export const importCollections = asyncHandler(async (req, res) => {
  // Pre-load admissions map keyed by lowercased name
  const admissions = await Admission.find().sort({ admittedOn: -1 }).lean();
  const admissionByName = new Map();
  for (const a of admissions) {
    const key = a.name.toLowerCase().trim();
    // First write wins because admissions are pre-sorted desc — newest one is preferred
    if (!admissionByName.has(key)) admissionByName.set(key, a);
  }

  const result = await runImport({
    buffer: req.file.buffer,
    headerMap: collectionHeaderMap,
    schema: collectionRowSchema,
    model: Collection,
    req,
    transform: (row) => {
      const adm = admissionByName.get(row.admissionName.toLowerCase().trim());
      if (!adm) return `No admission found for "${row.admissionName}" — add the admission first`;
      const method = (row.method || 'cash').toLowerCase().trim();
      return {
        admission: adm._id,
        team: adm.team,
        amount: row.amount,
        method: VALID_METHODS.has(method) ? method : 'cash',
        receiptNo: row.receiptNo || '',
        receivedOn: toDate(row.receivedOn) || new Date(),
        notes: row.notes || '',
      };
    },
  });
  res.status(result.status).json(result.body);
});

// ---------------------------------------------------------------------------
// Template downloads — empty Excel files with the right headers
// ---------------------------------------------------------------------------

const TEMPLATE_SPECS = {
  employees: {
    headers: ['Name', 'Email', 'Phone', 'Designation', 'Team', 'Joined On'],
    example: { Name: 'Priya Sharma', Email: 'priya@example.com', Phone: '+91 9876543210', Designation: 'Counsellor', Team: 'Sales A', 'Joined On': '2024-01-15' },
    filename: 'employees-template.xlsx',
  },
  registrations: {
    headers: ['Name', 'Course', 'Branch', 'Entry Type', 'University', 'Counselor Name', 'Date', 'Phone'],
    example: {
      Name: 'Rahul Verma',
      Course: 'B.Tech',
      Branch: 'Computer Science',
      'Entry Type': 'Counseling',
      University: 'Delhi University',
      'Counselor Name': 'Priya Sharma',
      Date: '2026-04-15',
      Phone: '+91 9123456789',
    },
    filename: 'registrations-template.xlsx',
  },
  admissions: {
    headers: ['Name', 'Course', 'Branch', 'Entry Type', 'University', 'Counselor Name', 'Date', 'Fee Amount'],
    example: {
      Name: 'Aarav Singh',
      Course: 'B.Tech',
      Branch: 'Computer Science',
      'Entry Type': 'Counseling',
      University: 'Delhi University',
      'Counselor Name': 'Priya Sharma',
      Date: '2026-04-10',
      'Fee Amount': 45000,
    },
    filename: 'admissions-template.xlsx',
  },
  collections: {
    headers: ['Student Name', 'Amount', 'Method', 'Receipt No', 'Received On', 'Notes'],
    example: { 'Student Name': 'Aarav Singh', Amount: 15000, Method: 'upi', 'Receipt No': 'RC1024', 'Received On': '2024-04-15', Notes: 'First installment' },
    filename: 'collections-template.xlsx',
  },
};

export const downloadTemplate = asyncHandler(async (req, res) => {
  const { resource } = req.params;
  const spec = TEMPLATE_SPECS[resource];
  if (!spec) {
    res.status(404);
    throw new Error(`No template for resource "${resource}"`);
  }
  const buffer = generateTemplate(spec.headers, spec.example);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${spec.filename}"`);
  res.send(buffer);
});
