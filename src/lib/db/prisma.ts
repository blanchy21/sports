import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma v6 with prisma.config.ts handles datasource URL externally.
// The generated types require adapter/accelerateUrl, but neither is
// needed when the URL is configured via prisma.config.ts.
export const prisma =
  globalForPrisma.prisma ?? new (PrismaClient as unknown as new () => PrismaClient)();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
