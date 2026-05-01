import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import { generateToken } from '../utils/generateToken.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400);
    throw new Error('User with this email already exists');
  }
  // First user becomes admin (bootstrap)
  const userCount = await User.countDocuments();
  const assignedRole = userCount === 0 ? 'admin' : role === 'admin' ? 'user' : role || 'user';

  const user = await User.create({ name, email, password, role: assignedRole });
  await Activity.create({
    user: user._id,
    type: 'user_joined',
    message: `${user.name} joined the system`,
  });

  res.status(201).json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    token: generateToken(user._id),
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  res.json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    token: generateToken(user._id),
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
