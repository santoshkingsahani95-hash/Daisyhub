import { prisma } from './prisma';

let isInitialized = false;
let isConnected = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Verifies the Prisma/MySQL connection is reachable. Table creation itself is
 * handled by `prisma db push` / migrations, not at runtime.
 */
export async function initializeMySqlTables(): Promise<boolean> {
  if (isInitialized) return isConnected;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      isConnected = true;
      console.log('✅ Connected to local MySQL Database via Prisma!');
    } catch (e: any) {
      isConnected = false;
      console.error('❌ [Prisma MySQL Connection Error]', e?.message || e);
    }
    isInitialized = true;
    return isConnected;
  })();

  return initPromise;
}

export function isMySqlConnected(): boolean {
  return isConnected;
}

/**
 * Saves a Buffer image as a LONGBLOB row and returns its /api/images/[id] URL
 */
export async function saveImageBlobToDb(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<string> {
  await initializeMySqlTables();
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  await prisma.image.create({
    data: { id: imageId, mimeType, data: new Uint8Array(buffer) },
  });

  return `/api/images/${imageId}`;
}

/**
 * Retrieves an image Buffer by id
 */
export async function getImageBlobFromDb(imageId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  await initializeMySqlTables();

  const row = await prisma.image.findUnique({ where: { id: imageId } });
  if (!row) return null;

  return { buffer: Buffer.from(row.data), mimeType: row.mimeType };
}
