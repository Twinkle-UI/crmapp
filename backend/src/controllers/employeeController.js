import asyncHandler from 'express-async-handler';
import Employee from '../models/Employee.js';
import Activity from '../models/Activity.js';

export const getEmployees = asyncHandler(async (req, res) => {
  const { search = '', team, status, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (team && team !== 'all') filter.team = team;
  if (status && status !== 'all') filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('team', 'name color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Employee.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: employees,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.create(req.body);
  await Activity.create({
    user: req.user._id,
    type: 'employee_added',
    message: `${req.user.name} added employee "${employee.name}"`,
    meta: { employeeId: employee._id },
  });
  req.app.get('io')?.emit('employee:created', employee);
  res.status(201).json({ success: true, data: employee });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }
  res.json({ success: true, data: employee });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) {
    res.status(404);
    throw new Error('Employee not found');
  }
  res.json({ success: true, message: 'Employee removed' });
});
