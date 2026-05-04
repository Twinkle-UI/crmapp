import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Activity from '../models/Activity.js';

/**
 * GET /api/users — list all users (admin only)
 * Returns users without password field for safety.
 */
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find()
    .select('-password')           // never expose hashes, even hashed ones
    .sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

/**
 * POST /api/users — create a new user (admin only)
 *
 * Why this is a separate endpoint from /auth/register:
 *  - /auth/register is the public self-signup flow (anyone can call it)
 *  - /api/users is the admin-managed flow — admin sets the password and role
 *    on behalf of the user, then shares credentials manually
 *
 * The User model's pre-save hook handles password hashing, so we just
 * pass the plaintext through and rely on Mongoose to hash before storage.
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'user' } = req.body;

  // Reject if email already used — case-insensitive check, since people
  // type emails with random capitalization
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),    // store normalized
    password,                       // hashed by pre-save hook
    role,
  });

  // Log the action so admin can audit who was added & when
  await Activity.create({
    user: req.user._id,
    type: 'user_added',
    message: `${req.user.name} created user "${user.name}" (${user.email})`,
    meta: { newUserId: user._id, role: user.role },
  });

  // Strip password before returning. Even though it's hashed, never echo it.
  const safe = user.toObject();
  delete safe.password;

  res.status(201).json({ success: true, data: safe });
});

/**
 * PUT /api/users/:id — update a user
 *
 * Special handling for password: if password field is present in body,
 * it goes through the User model. If absent, password is untouched.
 * Self-edits cannot change own role (prevents accidental privilege drop).
 */
export const updateUser = asyncHandler(async (req, res) => {
  const updates = { ...req.body };

  // Only admin can change roles. If current user is non-admin, drop the field.
  if (req.user.role !== 'admin') {
    delete updates.role;
  }

  // Never allow editing own role (admin can't accidentally demote themselves
  // and lock the org out)
  if (String(req.params.id) === String(req.user._id)) {
    delete updates.role;
  }

  // Empty password fields shouldn't overwrite the existing hash
  if (!updates.password || !updates.password.trim()) {
    delete updates.password;
  }

  // For password updates we need the User document so pre-save hook fires.
  // findByIdAndUpdate skips middleware, so we use save() instead.
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  Object.assign(user, updates);
  await user.save();

  const safe = user.toObject();
  delete safe.password;

  res.json({ success: true, data: safe });
});

/**
 * DELETE /api/users/:id — delete a user (admin only)
 *
 * Deliberate guard: an admin cannot delete their own account. If they could,
 * a single misclick could lock everyone out of the org.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await Activity.create({
    user: req.user._id,
    type: 'user_deleted',
    message: `${req.user.name} deleted user "${user.name}" (${user.email})`,
    meta: { deletedUserEmail: user.email },
  });

  res.json({ success: true, message: 'User removed' });
});