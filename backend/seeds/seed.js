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
import { citizens } from './data/citizens.js';
import { services } from './data/services.js';
import { users as demoUsers } from './data/users.js';

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
    '  Back-office accounts (see seeds/data/users.js):',
    ...demoUsers.map(
      (u) =>
        `    ${u.email.padEnd(32)}${u.password.padEnd(14)}${u.role.padEnd(12)}` +
        `${u.moduleScope.length ? u.moduleScope.join(', ') : 'tous les pôles'}`,
    ),
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
