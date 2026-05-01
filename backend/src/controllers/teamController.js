import asyncHandler from 'express-async-handler';
import Team from '../models/Team.js';
import Activity from '../models/Activity.js';

export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find().sort({ createdAt: -1 });
  res.json({ success: true, data: teams });
});

export const createTeam = asyncHandler(async (req, res) => {
  const team = await Team.create(req.body);
  await Activity.create({
    user: req.user._id,
    type: 'team_created',
    message: `${req.user.name} created team "${team.name}"`,
    meta: { teamId: team._id },
  });
  req.app.get('io')?.emit('team:created', team);
  res.status(201).json({ success: true, data: team });
});

export const updateTeam = asyncHandler(async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }
  res.json({ success: true, data: team });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const team = await Team.findByIdAndDelete(req.params.id);
  if (!team) {
    res.status(404);
    throw new Error('Team not found');
  }
  res.json({ success: true, message: 'Team removed' });
});
