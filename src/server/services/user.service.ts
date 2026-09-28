import { CustomerUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { initializeMySqlTables } from '@/lib/mysql';

interface EntityCache<T> {
  data: T | null;
  fetchedAt: number;
  softTtlMs: number;
  hardTtlMs: number;
}

export class UserService {
  private cache: EntityCache<CustomerUser[]> = {
    data: null,
    fetchedAt: 0,
    softTtlMs: 30000,
    hardTtlMs: 300000,
  };

  private inFlight: Promise<CustomerUser[]> | null = null;

  public invalidateCache(): void {
    this.cache.data = null;
    this.cache.fetchedAt = 0;
  }

  public async fetchUsers(): Promise<CustomerUser[]> {
    const now = Date.now();
    if (this.cache.data && now - this.cache.fetchedAt < this.cache.softTtlMs) {
      return this.cache.data;
    }

    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = (async () => {
      try {
        await initializeMySqlTables();
        const rows = await prisma.user.findMany({ orderBy: { registrationDate: 'desc' } });

        const users: CustomerUser[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          mobile: r.mobile || undefined,
          role: (r.role as any) || 'CUSTOMER',
          registrationDate: r.registrationDate || new Date().toISOString(),
          isBlocked: Boolean(r.isBlocked),
          addresses: Array.isArray(r.addresses) ? (r.addresses as any) : [],
        }));

        this.cache = {
          data: users,
          fetchedAt: Date.now(),
          softTtlMs: 30000,
          hardTtlMs: 300000,
        };
        return users;
      } catch (err: any) {
        console.error('[UserService fetchUsers Error]', err?.message || err);
        return this.cache.data || [];
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  public async getUserById(idOrEmail: string): Promise<CustomerUser | undefined> {
    const users = await this.fetchUsers();
    return users.find((u) => u.id === idOrEmail || u.email.toLowerCase() === idOrEmail.toLowerCase());
  }

  public async saveUser(user: CustomerUser): Promise<CustomerUser> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      const data = {
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        password: (user as any).password || null,
        role: user.role || 'CUSTOMER',
        registrationDate: user.registrationDate || new Date().toISOString(),
        isBlocked: !!user.isBlocked,
        addresses: (user.addresses || []) as any,
      };
      await prisma.user.upsert({
        where: { id: user.id },
        update: data,
        create: { id: user.id, ...data },
      });
      console.log(`[UserService] Successfully saved user ${user.email}`);
    } catch (err: any) {
      console.error(`[UserService] Error saving user ${user.email}:`, err?.message || err);
    }
    return user;
  }

  public async deleteUser(id: string): Promise<boolean> {
    this.invalidateCache();
    try {
      await initializeMySqlTables();
      await prisma.user.deleteMany({
        where: { OR: [{ id }, { email: id }] },
      });
      console.log(`[UserService] Successfully deleted user ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[UserService] Error deleting user ${id}:`, err?.message || err);
      return false;
    }
  }
}

const globalUserService = (globalThis as any).__userService || new UserService();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__userService = globalUserService;
}

export const userService = globalUserService as UserService;
