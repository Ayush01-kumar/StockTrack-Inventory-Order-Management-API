'use strict';
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/db');
const server = app.listen(env.PORT, () => console.log(`StockTrack API listening on port ${env.PORT}`));
async function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
