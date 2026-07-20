/**
 * Seeds the database with FICTIONAL demo data (CLAUDE.md §2).
 *
 * Destructive: wipes the collections it owns, then reinserts them.
 * Refuses to run against NODE_ENV=production.
 *
 *   npm run seed
 */
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { env, isProduction } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';
import { hashPassword } from '../src/utils/password.js';
import { Citizen, Service, User, OtpChallenge, Request } from '../src/models/index.js';
import { MODULE_KEYS, ROLES } from '../src/constants/index.js';
import { citizens } from './data/citizens.js';
import { services } from './data/services.js';

/**
 * Demo back-office accounts. Passwords are throwaway and printed on seed.
 *
 * One AGENT and one module ADMIN per module, plus a global SUPER_ADMIN — the
 * four-tier hierarchy (CLAUDE.md §4).
 */
const modules = [
  { key: MODULE_KEYS.IDENTITY, slug: 'identite', label: 'Identité & Voyage' },
  { key: MODULE_KEYS.LIFE_EVENTS, slug: 'etatcivil', label: 'Événements de Vie' },
  { key: MODULE_KEYS.MOBILITY, slug: 'transports', label: 'Mobilité Urbaine' },
  { key: MODULE_KEYS.LAND, slug: 'domaines', label: 'Titres Fonciers' },
];

const demoUsers = [
  ...modules.flatMap((m, i) => [
    {
      email: `agent.${m.slug}@ecivil.demo`,
      fullName: `Agent ${m.label}`,
      role: ROLES.AGENT,
      moduleScope: [m.key],
      password: `Demo!Agent${i + 1}`,
    },
    {
      email: `admin.${m.slug}@ecivil.demo`,
      fullName: `Admin ${m.label}`,
      role: ROLES.ADMIN,
      moduleScope: [m.key],
      password: `Demo!Admin${i + 1}`,
    },
  ]),
  {
    email: 'superadmin@ecivil.demo',
    fullName: 'Super-Administrateur eCivil',
    role: ROLES.SUPER_ADMIN,
    moduleScope: [],
    password: 'Demo!Super1',
  },
];

async function seed() {
  if (isProduction) {
    throw new Error('Refusing to seed: NODE_ENV=production');
  }

  await connectDatabase();
  logger.info(`Seeding ${env.MONGODB_URI}`);

  // Owned collections only — never a blanket dropDatabase.
  await Promise.all([
    Citizen.deleteMany({}),
    Service.deleteMany({}),
    User.deleteMany({}),
    OtpChallenge.deleteMany({}),
    Request.deleteMany({}),
  ]);
  logger.info('Cleared existing collections');

  const insertedCitizens = await Citizen.insertMany(citizens);
  logger.info(`Inserted ${insertedCitizens.length} fictional citizens`);

  const insertedServices = await Service.insertMany(services);
  logger.info(`Inserted ${insertedServices.length} services across 4 modules`);

  const usersToInsert = await Promise.all(
    demoUsers.map(async ({ password, ...user }) => ({
      ...user,
      passwordHash: await hashPassword(password),
    })),
  );
  await User.insertMany(usersToInsert);
  logger.info(`Inserted ${usersToInsert.length} back-office accounts`);

  printSummary(insertedCitizens);
}

function printSummary(insertedCitizens) {
  const lines = [
    '',
    '  Demo data ready — ALL FICTIONAL, no legal value.',
    '',
    '  Citizens (log in with the NINA, OTP is printed by the API in dev):',
    ...insertedCitizens.map(
      (c) => `    ${c.nina}  ${c.fullName.padEnd(22)}${c.isDiaspora ? '(diaspora)' : ''}`,
    ),
    '',
    '  Back-office accounts (usable from Phase 4):',
    ...demoUsers.map((u) => `    ${u.email.padEnd(32)}${u.password}`),
    '',
  ];
  console.log(lines.join('\n'));
}

seed()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error({ err }, 'Seed failed');
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  });
