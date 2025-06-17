const { PrismaClient } = require('@prisma/client');

// Create Prisma client singleton
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty'
});

// Handle Prisma client errors
prisma.$on('error', (e) => {
  console.error('Prisma Client Error:', e);
});

module.exports = prisma;
