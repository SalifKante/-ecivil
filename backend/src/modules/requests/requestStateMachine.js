import { REQUEST_TRANSITIONS } from '../../constants/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { notifyPendingTransitions } from '../notifications/notification.service.js';

export function canTransition(from, to) {
  return REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Applies a status change to a request document IN MEMORY (caller saves).
 *
 * This is the ONLY place a request's status is allowed to change. It rejects any
 * transition not permitted by REQUEST_TRANSITIONS and records the move on the
 * timeline, so status and history can never drift apart.
 *
 * `actor` = { id, role } — who caused the change (a citizen, an agent, or the system).
 */
export function applyTransition(request, to, { actor, note } = {}) {
  const from = request.status;

  if (!canTransition(from, to)) {
    throw ApiError.conflict('INVALID_TRANSITION', `Cannot move request from ${from} to ${to}`, {
      from,
      to,
      allowed: REQUEST_TRANSITIONS[from] ?? [],
    });
  }

  request.status = to;
  request.timeline.push({
    from,
    to,
    actorId: actor?.id,
    actorRole: actor?.role,
    note,
    at: new Date(),
  });

  // Queued rather than sent here: this function does not save, and telling a
  // citizen about a change that never persists is worse than telling them late.
  // `commitRequest` flushes the queue once the write lands.
  // `$locals` exists on a Mongoose document but not on a plain object, which the
  // state machine must still accept — it is pure logic and unit-tested as such.
  request.$locals ??= {};
  request.$locals.pendingTransitions ??= [];
  request.$locals.pendingTransitions.push({ from, to, note });

  return request;
}

/**
 * Saves a request and notifies the citizen of every transition applied to it.
 *
 * Use this instead of `request.save()` anywhere a transition was applied. Keeping
 * save and notify together is what stops a new code path from silently skipping
 * the notification.
 */
export async function commitRequest(request) {
  await request.save();
  await notifyPendingTransitions(request);
  return request;
}
