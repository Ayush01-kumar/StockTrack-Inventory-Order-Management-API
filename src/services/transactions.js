'use strict';
const prisma = require('../config/db');
async function serializable(work, retries = 2) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await prisma.$transaction(work, { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }); }
    catch (error) {
      if (attempt >= retries || error.code !== 'P2034') throw error;
    }
  }
}
module.exports = { serializable };
