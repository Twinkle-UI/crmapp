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
 * Build a daily trend array for the given date range.
 *
 * MongoDB returns only days that have data — but the chart needs every day
 * (otherwise gaps look weird). So after aggregation, we fill in missing days
 * with count: 0. Result is a continuous date series, perfect for area charts.
 */
const buildDailyTrend = (rawData, since) => {
  // Map of "YYYY-MM-DD" → count from the aggregation
  const map = new Map(rawData.map((d) => [d._id, d.count]));

  const result = [];
  const start = new Date(since);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Walk day-by-day from `since` to today, filling zeros for empty days
  const cursor = new Date(start);
  while (cursor <= today) {
    const key = cursor.toISOString().split('T')[0]; // "2026-04-15"
    result.push({
      date: key,
      // Display label: "Apr 15" — short, readable on chart x-axis
      label: cursor.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      count: map.get(key) || 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
};

/**
 * Main dashboard endpoint — returns every widget's data in one call.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const { range = 'thisMonth' } = req.query;
  const since = rangeToDate(range);

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
    counselorPerformanceRaw,
    registrationDailyRaw,
    admissionDailyRaw,
  ] = await Promise.all([
    Employee.countDocuments({ status: 'active' }),
    Registration.countDocuments({ createdAt: { $gte: monthStart } }),
    Admission.countDocuments({ admittedOn: { $gte: monthStart } }),

    Collection.aggregate([
      { $match: { receivedOn: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),

    Collection.aggregate([
      { $match: { receivedOn: { $gte: since } } },
      { $group: { _id: '$team', revenue: { $sum: '$amount' } } },
    ]),

    Team.find().lean(),

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

    // Counselor performance — within selected range
    Admission.aggregate([
      { $match: { admittedOn: { $gte: since } } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$counselorName' } } },
          displayName: { $first: '$counselorName' },
          admissions: { $sum: 1 },
          revenue: { $sum: '$feeAmount' },
        },
      },
      { $sort: { revenue: -1, admissions: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          counselorName: '$displayName',
          admissions: 1,
          revenue: 1,
        },
      },
    ]),

    // Daily registrations within selected range
    // dateToString formats the date once at DB level — fast and timezone-safe
    Registration.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Daily admissions within selected range
    Admission.aggregate([
      { $match: { admittedOn: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$admittedOn' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

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

  const teamPerformance = teams.map((t) => {
    const found = revenueByTeamRaw.find((r) => String(r._id) === String(t._id));
    return {
      team: t.name,
      color: t.color,
      actual: found?.revenue || 0,
      target: t.monthlyTarget || 0,
    };
  });

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

  // Fill in missing days with 0 — area charts need continuous data
  const registrationDaily = buildDailyTrend(registrationDailyRaw, since);
  const admissionDaily = buildDailyTrend(admissionDailyRaw, since);

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
      counselorPerformance: counselorPerformanceRaw,
      registrationDaily,
      admissionDaily,
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