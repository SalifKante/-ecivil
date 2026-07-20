import { describe, it, expect } from 'vitest';
import { canTransition, applyTransition } from '../src/modules/requests/requestStateMachine.js';
import { REQUEST_STATUS as S, REQUEST_TRANSITIONS } from '../src/constants/index.js';

describe('canTransition', () => {
  it('allows valid moves', () => {
    expect(canTransition(S.DRAFT, S.SUBMITTED)).toBe(true);
    expect(canTransition(S.UNDER_REVIEW, S.APPROVED)).toBe(true);
    expect(canTransition(S.NEEDS_INFO, S.SUBMITTED)).toBe(true);
  });

  it('rejects invalid moves', () => {
    expect(canTransition(S.DRAFT, S.APPROVED)).toBe(false);
    expect(canTransition(S.DRAFT, S.PAID)).toBe(false);
    expect(canTransition(S.PENDING_PAYMENT, S.APPROVED)).toBe(false);
  });

  it('treats REJECTED and DELIVERED as terminal', () => {
    expect(canTransition(S.REJECTED, S.SUBMITTED)).toBe(false);
    expect(canTransition(S.DELIVERED, S.ISSUED)).toBe(false);
  });

  /**
   * Exhaustive rather than spot-checked. The request lifecycle is the core domain
   * object, and an accidental edit to REQUEST_TRANSITIONS — one stray status in an
   * array — would open a path like PENDING_PAYMENT → APPROVED without any single
   * example test noticing.
   */
  it('permits exactly the declared transitions and nothing else', () => {
    const all = Object.values(S);
    const unexpected = [];

    for (const from of all) {
      for (const to of all) {
        const allowed = (REQUEST_TRANSITIONS[from] ?? []).includes(to);
        if (canTransition(from, to) !== allowed) unexpected.push(`${from} -> ${to}`);
      }
    }

    expect(unexpected).toEqual([]);
  });

  it('never lets a request skip payment on the way to review', () => {
    // The money path: nothing reaches UNDER_REVIEW except through PAID.
    const intoReview = Object.values(S).filter((from) => canTransition(from, S.UNDER_REVIEW));
    expect(intoReview).toEqual([S.PAID]);
  });

  it('never returns to DRAFT once submitted', () => {
    const backToDraft = Object.values(S).filter((from) => canTransition(from, S.DRAFT));
    expect(backToDraft).toEqual([]);
  });

  it('treats an unknown status as allowing nothing', () => {
    expect(canTransition('NOT_A_STATUS', S.SUBMITTED)).toBe(false);
    expect(canTransition(undefined, S.SUBMITTED)).toBe(false);
  });
});

describe('applyTransition', () => {
  const makeRequest = (status) => ({ status, timeline: [] });

  it('updates status and appends a timeline entry', () => {
    const request = makeRequest(S.DRAFT);
    applyTransition(request, S.SUBMITTED, { actor: { id: 'c1', role: 'CITIZEN' }, note: 'go' });

    expect(request.status).toBe(S.SUBMITTED);
    expect(request.timeline).toHaveLength(1);
    expect(request.timeline[0]).toMatchObject({
      from: S.DRAFT,
      to: S.SUBMITTED,
      actorRole: 'CITIZEN',
      note: 'go',
    });
  });

  it('throws on an illegal transition and leaves the request untouched', () => {
    const request = makeRequest(S.DRAFT);
    expect(() => applyTransition(request, S.ISSUED, {})).toThrowError(/Cannot move/);
    expect(request.status).toBe(S.DRAFT);
    expect(request.timeline).toHaveLength(0);
  });
});
