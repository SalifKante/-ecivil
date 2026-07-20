/** Shared domain enums. Single source of truth for models, validation and the UI contract. */

export const MODULE_KEYS = Object.freeze({
  IDENTITY: 'identity',
  LIFE_EVENTS: 'lifeEvents',
  MOBILITY: 'mobility',
  LAND: 'land',
});

export const ROLES = Object.freeze({
  CITIZEN: 'CITIZEN',
  AGENT: 'AGENT', // frontline reviewer, scoped to one module
  ADMIN: 'ADMIN', // runs one module (its agents, services, tariffs), scoped
  SUPER_ADMIN: 'SUPER_ADMIN', // platform operators, global — empty moduleScope
});

/** Back-office roles (everyone who is not a citizen). */
export const STAFF_ROLES = Object.freeze([ROLES.AGENT, ROLES.ADMIN, ROLES.SUPER_ADMIN]);

export const REQUEST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  UNDER_REVIEW: 'UNDER_REVIEW',
  NEEDS_INFO: 'NEEDS_INFO',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ISSUED: 'ISSUED',
  DELIVERED: 'DELIVERED',
});

/** Allowed transitions. The service layer rejects anything not listed here. */
export const REQUEST_TRANSITIONS = Object.freeze({
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['PENDING_PAYMENT', 'REJECTED'],
  PENDING_PAYMENT: ['PAID', 'REJECTED'],
  PAID: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'NEEDS_INFO'],
  NEEDS_INFO: ['SUBMITTED', 'REJECTED'],
  APPROVED: ['ISSUED'],
  ISSUED: ['DELIVERED'],
  REJECTED: [],
  DELIVERED: [],
});

export const PAYMENT_PROVIDERS = Object.freeze({
  ORANGE_MONEY: 'ORANGE_MONEY',
  WAVE: 'WAVE',
  CARD: 'CARD',
});

export const PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
});

/**
 * MOCK-only: how the demo operator chooses to settle a payment attempt. A real
 * gateway decides the outcome itself, so this enum disappears with the mock.
 */
export const PAYMENT_OUTCOMES = Object.freeze({
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
});

export const DELIVERY_MODES = Object.freeze({
  DIGITAL: 'DIGITAL',
  HOME: 'HOME',
  PICKUP_POINT: 'PICKUP_POINT',
});

export const NOTIFICATION_CHANNELS = Object.freeze({ SMS: 'SMS', EMAIL: 'EMAIL' });

export const CURRENCY = 'XOF';

/**
 * Demo NINAs are 14 digits and always start with this prefix so a prototype
 * identifier can never collide with, or be mistaken for, a real citizen's NINA.
 */
export const DEMO_NINA_PREFIX = '9999';
export const NINA_LENGTH = 14;
export const NINA_REGEX = /^\d{14}$/;
