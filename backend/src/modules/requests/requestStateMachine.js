import { REQUEST_TRANSITIONS } from '../../constants/index.js';
import { ApiError } from '../../utils/ApiError.js';

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

  return request;
}
