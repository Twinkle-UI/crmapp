import asyncHandler from 'express-async-handler';
import Admission from '../models/Admission.js';
import Registration from '../models/Registration.js';
import Activity from '../models/Activity.js';

/**
 * GET /api/admissions
 * Filters: search (name/counselor/university), course, branch, entryType, status, from, to
 */
export const getAdmissions = asyncHandler(async (req, res) => {
  const {
    search = '',
    course,
    branch,
    entryType,
    status,
    page = 1,
    limit = 10,
    from,
    to,
  } = req.query;

  const filter = {};
  if (course && course !== 'all') filter.course = course;
  if (branch && branch !== 'all') filter.branch = branch;
  if (entryType && entryType !== 'all') filter.entryType = entryType;
  if (status && status !== 'all') filter.status = status;

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
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Admission.find(filter)
      .populate('team', 'name color')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Admission.countDocuments(filter),
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
 * Create admission. If `registration` ID is provided, mark that registration as converted.
 */
export const createAdmission = asyncHandler(async (req, res) => {
  // Mirror date → admittedOn for legacy aggregations
  if (req.body.date) req.body.admittedOn = req.body.date;

  const adm = await Admission.create(req.body);

  if (adm.registration) {
    await Registration.findByIdAndUpdate(adm.registration, { converted: true });
  }

  await Activity.create({
    user: req.user._id,
    type: 'admission_added',
    message: `${req.user.name} admitted "${adm.name}" (${adm.course}) — fee ₹${adm.feeAmount}`,
    meta: { admissionId: adm._id, amount: adm.feeAmount },
  });
  req.app.get('io')?.emit('admission:created', adm);
  res.status(201).json({ success: true, data: adm });
});

export const updateAdmission = asyncHandler(async (req, res) => {
  if (req.body.date) req.body.admittedOn = req.body.date;
  const adm = await Admission.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!adm) {
    res.status(404);
    throw new Error('Admission not found');
  }
  res.json({ success: true, data: adm });
});

export const deleteAdmission = asyncHandler(async (req, res) => {
  const adm = await Admission.findByIdAndDelete(req.params.id);
  if (!adm) {
    res.status(404);
    throw new Error('Admission not found');
  }
  res.json({ success: true, message: 'Admission removed' });
});
