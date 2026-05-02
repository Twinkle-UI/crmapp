import asyncHandler from "express-async-handler";
import Collection from "../models/Collection.js";
import Admission from "../models/Admission.js";
import Activity from "../models/Activity.js";

/**
 * GET /api/collections
 * Filters: search, method, from, to
 */
export const getCollections = asyncHandler(async (req, res) => {
  const { search = "", method, page = 1, limit = 50, from, to } = req.query;

  const filter = {};
  if (method && method !== "all") filter.method = method;
  if (from || to) {
    filter.receivedOn = {};
    if (from) filter.receivedOn.$gte = new Date(from);
    if (to) filter.receivedOn.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { receiptNo: { $regex: search, $options: "i" } },
      { notes: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Collection.find(filter)
      .populate({
        path: "admission",
        select: "name course feeAmount",
      })
      .populate("team", "name color")
      .sort({ receivedOn: -1, createdAt: -1 })
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

/**
 * Get all admissions (for the dropdown when recording a payment)
 */
export const getAdmissionsForDropdown = asyncHandler(async (req, res) => {
  const admissions = await Admission.find({ status: { $ne: "dropped" } })
    .select("name course feeAmount team")
    .populate("team", "name")
    .sort({ admittedOn: -1 })
    .lean();
  res.json({ success: true, data: admissions });
});

/**
 * Create a collection (record a payment).
 *
 * The form doesn't ask for `team` — it's implied by the admission. So before
 * creating, we look up the admission and copy its team onto the collection.
 *
 * Why team is denormalized here (rather than always join-querying the admission):
 * "Revenue by Team" dashboard widget aggregates collections by team_id directly,
 * which is significantly faster than a $lookup join on every render. The team
 * rarely changes mid-stream, so this small denormalization is a safe trade.
 *
 * Receipt number auto-generation: if the user didn't provide one, we generate
 * RC{timestamp} so each receipt is unique and traceable. Receipt is `unique`
 * in the schema, so blanks would collide — auto-gen prevents that.
 */
export const createCollection = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  // Look up admission to inherit team
  if (!payload.team && payload.admission) {
    const adm = await Admission.findById(payload.admission)
      .select("team")
      .lean();
    if (!adm) {
      res.status(404);
      throw new Error("Admission not found");
    }
    if (!adm.team) {
      // Admission has no team set — fall back to first available team so
      // the collection still gets created. Better than blocking the user.
      const Team = (await import("../models/Team.js")).default;
      const fallback = await Team.findOne().select("_id").lean();
      if (!fallback) {
        res.status(400);
        throw new Error("No teams exist — please create a team first");
      }
      payload.team = fallback._id;
    } else {
      payload.team = adm.team;
    }
  }

  // Auto-generate receipt number if blank
  if (!payload.receiptNo || !payload.receiptNo.trim()) {
    payload.receiptNo = `RC${Date.now()}`;
  }

  // Default receivedOn to today if not provided
  if (!payload.receivedOn) {
    payload.receivedOn = new Date();
  }

  const col = await Collection.create(payload);

  await Activity.create({
    user: req.user._id,
    type: "collection_added",
    message: `${req.user.name} recorded ₹${col.amount} (${col.method}) — receipt ${col.receiptNo}`,
    meta: { collectionId: col._id, amount: col.amount },
  });
  req.app.get("io")?.emit("collection:created", col);

  // Return populated record so the table can render immediately
  const populated = await Collection.findById(col._id)
    .populate({ path: "admission", select: "name course feeAmount" })
    .populate("team", "name color");

  res.status(201).json({ success: true, data: populated });
});

export const updateCollection = asyncHandler(async (req, res) => {
  const col = await Collection.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!col) {
    res.status(404);
    throw new Error("Collection not found");
  }
  res.json({ success: true, data: col });
});

export const deleteCollection = asyncHandler(async (req, res) => {
  const col = await Collection.findByIdAndDelete(req.params.id);
  if (!col) {
    res.status(404);
    throw new Error("Collection not found");
  }
  res.json({ success: true, message: "Collection removed" });
});
