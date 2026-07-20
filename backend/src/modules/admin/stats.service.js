import { Request, Payment, User } from '../../models/index.js';
import { moduleScopeFilter } from '../../middleware/rbac.js';
import { REQUEST_STATUS, PAYMENT_STATUS, ROLES } from '../../constants/index.js';

/**
 * Dashboard statistics, scoped by role: a module ADMIN sees its own module, a
 * SUPER_ADMIN sees the platform. The scope is applied to the query itself rather
 * than filtered afterwards, so an out-of-scope request never reaches the caller
 * even as a number.
 */

/** Statuses that still need someone to act. Drives the "à traiter" figure. */
const OPEN_STATUSES = [
  REQUEST_STATUS.PAID,
  REQUEST_STATUS.UNDER_REVIEW,
  REQUEST_STATUS.NEEDS_INFO,
];

function scopedFilter(auth) {
  const filter = { status: { $ne: REQUEST_STATUS.DRAFT } };
  const scope = moduleScopeFilter(auth);
  if (scope) filter.moduleKey = scope;
  return filter;
}

export async function getStats({ auth, days = 14 }) {
  const base = scopedFilter(auth);

  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [byStatus, byModule, totals, revenue, perDay, staffCount] = await Promise.all([
    Request.aggregate([{ $match: base }, { $group: { _id: '$status', count: { $sum: 1 } } }]),

    Request.aggregate([{ $match: base }, { $group: { _id: '$moduleKey', count: { $sum: 1 } } }]),

    Request.countDocuments(base),

    // Revenue counts settled payments only, and re-applies the module scope by
    // joining through the request — a Payment row carries no moduleKey of its own.
    Payment.aggregate([
      { $match: { status: PAYMENT_STATUS.SUCCEEDED } },
      {
        $lookup: {
          from: Request.collection.name,
          localField: 'requestId',
          foreignField: '_id',
          as: 'request',
        },
      },
      { $unwind: '$request' },
      ...(base.moduleKey ? [{ $match: { 'request.moduleKey': base.moduleKey } }] : []),
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),

    Request.aggregate([
      { $match: { ...base, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    countStaff(auth),
  ]);

  const statusMap = Object.fromEntries(byStatus.map((r) => [r._id, r.count]));

  return {
    scope: auth.role === ROLES.SUPER_ADMIN ? 'GLOBAL' : (auth.moduleScope ?? []),
    totals: {
      requests: totals,
      open: OPEN_STATUSES.reduce((sum, s) => sum + (statusMap[s] ?? 0), 0),
      issued: (statusMap[REQUEST_STATUS.ISSUED] ?? 0) + (statusMap[REQUEST_STATUS.DELIVERED] ?? 0),
      rejected: statusMap[REQUEST_STATUS.REJECTED] ?? 0,
      staff: staffCount,
    },
    revenue: {
      // Integer XOF, like every amount in the system.
      total: revenue[0]?.total ?? 0,
      payments: revenue[0]?.count ?? 0,
      currency: 'XOF',
    },
    byStatus: statusMap,
    byModule: Object.fromEntries(byModule.map((r) => [r._id, r.count])),
    perDay: fillMissingDays(perDay, since, days),
  };
}

async function countStaff(auth) {
  const filter = { isActive: true };
  const scope = moduleScopeFilter(auth);

  if (scope) {
    filter.role = ROLES.AGENT;
    filter.moduleScope = scope;
  }
  return User.countDocuments(filter);
}

/**
 * Aggregation returns nothing for a day with no requests. A chart needs the gap
 * to be an explicit zero, or it draws a line straight over the quiet days.
 */
function fillMissingDays(rows, since, days) {
  const found = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const out = [];

  for (let i = 0; i < days; i += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, count: found[key] ?? 0 });
  }
  return out;
}
