import asyncHandler from 'express-async-handler';
import Employee from '../models/Employee.js';
import Registration from '../models/Registration.js';
import Admission from '../models/Admission.js';
import Collection from '../models/Collection.js';
import Team from '../models/Team.js';
import Activity from '../models/Activity.js';

/**
 * Convert range string ("7" / "30" / "90" / "thisMonth") → start Date.
 * thisMonth → from the 1st of the current month at 00:00.
 */
const rangeToDate = (range) => {
  if (range === 'thisMonth') {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const days = Number(range) || 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

/**
 * Main dashboard endpoint — returns every widget's data in one call.
 * GET /api/dashboard?range=7|30|90|thisMonth
 *
 * Returns:
 *   - kpis: { totalEmployees, totalRegister, totalAdmission, totalCollection }
 *   - revenueByTeam: [{ teamId, teamName, color, revenue }]
 *   - teamPerformance: [{ team, actual, target }]
 *   - registerThisMonth / admissionThisMonth: small lists for the side widgets
 *   - monthlyTrend: last 6 months collection trend (for an extra chart if needed)
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const { range = 'thisMonth' } = req.query;
  const since = rangeToDate(range);

  // Always compute "this month" for the 3 KPIs that say "This month" in the sketch
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalEmployees,
    totalRegister,
    totalAdmission,
    collectionAgg,
    revenueByTeamRaw,
    teams,
    recentRegistrations,
    recentAdmissions,
  ] = await Promise.all([
    Employee.countDocuments({ status: 'active' }),
    Registration.countDocuments({ createdAt: { $gte: monthStart } }),
    Admission.countDocuments({ admittedOn: { $gte: monthStart } }),

    // Total collection this month
    Collection.aggregate([
      { $match: { receivedOn: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    // Revenue by team (within selected range — drives the "Revenue by Team" card)
    Collection.aggregate([
      { $match: { receivedOn: { $gte: since } } },
      { $group: { _id: '$team', revenue: { $sum: '$amount' } } },
    ]),

    // Teams (for joining names + targets)
    Team.find().lean(),

    // Side widgets — recent registrations / admissions this month
    Registration.find({ createdAt: { $gte: monthStart } })
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Admission.find({ admittedOn: { $gte: monthStart } })
      .populate('team', 'name')
      .sort({ admittedOn: -1 })
      .limit(5)
      .lean(),
  ]);

  // Stitch revenueByTeam with team metadata
  const teamMap = new Map(teams.map((t) => [String(t._id), t]));
  const revenueByTeam = revenueByTeamRaw.map((r) => {
    const t = teamMap.get(String(r._id));
    return {
      teamId: r._id,
      teamName: t?.name || 'Unknown',
      color: t?.color || '#888',
      revenue: r.revenue,
    };
  });

  // Team Performance vs Target — every team gets an entry, even if revenue is 0
  const teamPerformance = teams.map((t) => {
    const found = revenueByTeamRaw.find((r) => String(r._id) === String(t._id));
    return {
      team: t.name,
      color: t.color,
      actual: found?.revenue || 0,
      target: t.monthlyTarget || 0,
    };
  });

  // Monthly trend (last 6 months) — useful extra
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyTrend = await Collection.aggregate([
    { $match: { receivedOn: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: { y: { $year: '$receivedOn' }, m: { $month: '$receivedOn' } },
        revenue: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
    {
      $project: {
        _id: 0,
        month: { $concat: [{ $toString: '$_id.y' }, '-', { $toString: '$_id.m' }] },
        revenue: 1,
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      kpis: {
        totalEmployees,
        totalRegister,
        totalAdmission,
        totalCollection: collectionAgg[0]?.total || 0,
      },
      revenueByTeam,
      teamPerformance,
      monthlyTrend,
      recentRegistrations,
      recentAdmissions,
    },
  });
});

/**
 * Activity feed — used by "Recent Activity" widget.
 */
export const getActivityFeed = asyncHandler(async (req, res) => {
  const { limit = 15 } = req.query;
  const activities = await Activity.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(Number(limit));
  res.json({ success: true, data: activities });
});
