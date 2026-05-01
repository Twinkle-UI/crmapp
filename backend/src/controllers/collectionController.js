import asyncHandler from 'express-async-handler';
import Collection from '../models/Collection.js';
import Activity from '../models/Activity.js';

export const getCollections = asyncHandler(async (req, res) => {
  const { team, method, page = 1, limit = 10, from, to } = req.query;
  const filter = {};
  if (team && team !== 'all') filter.team = team;
  if (method && method !== 'all') filter.method = method;
  if (from || to) {
    filter.receivedOn = {};
    if (from) filter.receivedOn.$gte = new Date(from);
    if (to) filter.receivedOn.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Collection.find(filter)
      .populate('admission', 'name program')
      .populate('team', 'name color')
      .populate('receivedBy', 'name')
      .sort({ receivedOn: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Collection.countDocuments(filter),
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

export const createCollection = asyncHandler(async (req, res) => {
  const col = await Collection.create(req.body);
  await Activity.create({
    user: req.user._id,
    type: 'collection_received',
    message: `${req.user.name} recorded collection ₹${col.amount} (${col.method})`,
    meta: { collectionId: col._id, amount: col.amount },
  });
  req.app.get('io')?.emit('collection:created', col);
  res.status(201).json({ success: true, data: col });
});

export const deleteCollection = asyncHandler(async (req, res) => {
  const col = await Collection.findByIdAndDelete(req.params.id);
  if (!col) {
    res.status(404);
    throw new Error('Collection not found');
  }
  res.json({ success: true, message: 'Collection removed' });
});
