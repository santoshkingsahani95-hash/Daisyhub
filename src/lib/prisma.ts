import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = (process.env.DATABASE_URL || 'mysql://root@localhost:3306/daisyhub').replace(/^mysql:\/\//i, 'mariadb://');
const adapter = new PrismaMariaDb(connectionString);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
