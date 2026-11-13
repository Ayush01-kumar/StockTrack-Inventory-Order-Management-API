'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and a 12+ character ADMIN_PASSWORD before seeding.');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({ where: { email: ADMIN_EMAIL.toLowerCase() }, update: { name: ADMIN_NAME, passwordHash, role: 'ADMIN', isActive: true }, create: { name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'ADMIN' } });
  console.log(`Admin account ready for ${ADMIN_EMAIL.toLowerCase()}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
