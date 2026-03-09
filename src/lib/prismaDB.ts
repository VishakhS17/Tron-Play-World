import { PrismaClient } from "@prisma/client"
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = global as unknown as {
  prisma: PrismaClient
}

const missingDbClient = new Proxy(
  {},
  {
    get() {
      return () => {
        throw new Error("DATABASE_URL is not configured")
      }
    },
  }
) as PrismaClient

const prismaClient =
  process.env.DATABASE_URL
    ? new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
    })
    : missingDbClient

export const prisma = globalForPrisma.prisma || prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
