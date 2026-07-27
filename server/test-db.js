require('dotenv').config({ path: './.env' });
const prisma = require('./src/lib/prisma');

async function test() {
  try {
    await prisma.$connect();
    console.log("DB_SUCCESS");
    process.exit(0);
  } catch (err) {
    console.error("DB_ERROR:", err.message);
    process.exit(1);
  }
}

test();
