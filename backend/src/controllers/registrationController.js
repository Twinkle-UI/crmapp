import asyncHandler from 'express-async-handler';
import Registration, {
  COURSE_OPTIONS,
  BRANCH_OPTIONS,
  ENTRY_TYPE_OPTIONS,
} from '../models/Registration.js';
import Activity from '../models/Activity.js';

/**
 * GET /api/registrations
 * Filters: search (name/counselor/university), course, branch, entryType, from, to
 */
export const getRegistrations = asyncHandler(async (req, res) => {
  const {
    search = '',
    course,
    branch,
    entryType,
    page = 1,
    limit = 10,
    from,
    to,
  } = req.query;

  const filter = {};
  if (course && course !== 'all') filter.course = course;
  if (branch && branch !== 'all') filter.branch = branch;
  if (entryType && entryType !== 'all') filter.entryType = entryType;

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [
      { name: re },
      { counselorName: re },
      { university: re },
      { phone: re },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Registration.find(filter)
      .populate('team', 'name color')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Registration.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

/**
 * GET /api/registrations/options
 * Returns the predefined dropdown options so the frontend never hardcodes them.
 */
export const getRegistrationOptions = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      courses: COURSE_OPTIONS,
      branches: BRANCH_OPTIONS,
      entryTypes: ENTRY_TYPE_OPTIONS,
    },
  });
});

export const createRegistration = asyncHandler(async (req, res) => {
  const reg = await Registration.create(req.body);
  await Activity.create({
    user: req.user._id,
    type: 'registration_added',
    message: `${req.user.name} registered "${reg.name}" (${reg.course} — ${reg.branch})`,
    meta: { registrationId: reg._id },
  });
  req.app.get('io')?.emit('registration:created', reg);
  res.status(201).json({ success: true, data: reg });
});

export const updateRegistration = asyncHandler(async (req, res) => {
  const reg = await Registration.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!reg) {
    res.status(404);
    throw new Error('Registration not found');
  }
  res.json({ success: true, data: reg });
});

export const deleteRegistration = asyncHandler(async (req, res) => {
  const reg = await Registration.findByIdAndDelete(req.params.id);
  if (!reg) {
    res.status(404);
    throw new Error('Registration not found');
  }
  res.json({ success: true, message: 'Registration removed' });
});
