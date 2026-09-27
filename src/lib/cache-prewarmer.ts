import { serverDb } from './server-db';

export interface PrewarmerLogEntry {
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface PrewarmerStats {
  status: 'IDLE' | 'WARMING_ENTITIES' | 'CRAWLING_ROUTES';
  lastWarmedAt: number;
  lastCrawlDurationMs: number;
  totalWarmRuns: number;
  totalCrawlRuns: number;
  totalUrlsCrawled: number;
  failedUrlsCount: number;
  daemonActive: boolean;
  logs: PrewarmerLogEntry[];
}

class CachePrewarmer {
  private status: 'IDLE' | 'WARMING_ENTITIES' | 'CRAWLING_ROUTES' = 'IDLE';
  private lastWarmedAt = 0;
  private lastCrawlDurationMs = 0;
  private totalWarmRuns = 0;
  private totalCrawlRuns = 0;
  private totalUrlsCrawled = 0;
  private failedUrlsCount = 0;
  private daemonIntervalId: NodeJS.Timeout | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private logs: PrewarmerLogEntry[] = [];
  private readonly MAX_LOGS = 100;

  constructor() {
    this.addLog('INFO', 'Cache Pre-warmer & Crawler initialized');
    // Eagerly initiate warm-up in background after microtask
    if (typeof window === 'undefined') {
      setTimeout(() => {
        this.warmupAll({ crawlRoutes: false }).catch((err) => {
          this.addLog('ERROR', `Eager background pre-warm failed: ${err?.message || err}`);
        });
      }, 500);
    }
  }

  private addLog(type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) {
    const entry: PrewarmerLogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
    console.log(`[Cache Crawler] [${type}] ${message}`);
  }

  /**
   * Pre-warm all database object caches (Entities)
   */
  public async warmEntities(force = true): Promise<{ success: boolean; itemCount: number; durationMs: number }> {
    const start = Date.now();
    this.status = 'WARMING_ENTITIES';
    this.addLog('INFO', 'Starting database object cache pre-warming...');

    try {
      const data = await serverDb.getFreshData(force);
      const durationMs = Date.now() - start;
      const itemCount =
        (data.products?.length || 0) +
        (data.categories?.length || 0) +
        (data.collections?.length || 0) +
        (data.orders?.length || 0) +
        (data.coupons?.length || 0) +
        (data.users?.length || 0) +
        (data.cms?.deliveryRates?.length || 0) + 1;

      this.lastWarmedAt = Date.now();
      this.totalWarmRuns++;
      this.status = 'IDLE';

      this.addLog(
        'SUCCESS',
        `DB object cache pre-warmed successfully (${itemCount} objects across 8 entities in ${durationMs}ms)`
      );

      return { success: true, itemCount, durationMs };
    } catch (err: any) {
      this.status = 'IDLE';
      this.addLog('ERROR', `Failed to pre-warm DB object cache: ${err?.message || err}`);
      return { success: false, itemCount: 0, durationMs: Date.now() - start };
    }
  }

  /**
   * Crawl internal routes and API endpoints to warm up Next.js server & route caches
   */
  public async crawlRoutes(baseUrl?: string): Promise<{ success: boolean; crawledCount: number; failedCount: number; durationMs: number }> {
    const start = Date.now();
    this.status = 'CRAWLING_ROUTES';
    this.addLog('INFO', 'Gathering route targets for cache crawling...');

    const host = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    try {
      // Get DB entities to build dynamic crawl URLs
      const data = await serverDb.getFreshData(false);

      const targetUrls: string[] = [
        `${host}/api/db`,
        `${host}/api/inventory`,
        `${host}/`,
        `${host}/shop`,
        `${host}/about`,
        `${host}/contact`,
        `${host}/faq`,
      ];

      // Add Category routes
      (data.categories || []).forEach((cat) => {
        if (cat.slug) targetUrls.push(`${host}/category/${cat.slug}`);
      });

      // Add Collection routes
      ['new-arrivals', 'sale', 'trending', 'best-sellers'].forEach((slug) => {
        targetUrls.push(`${host}/category/${slug}`);
      });

      // Add Product routes
      (data.products || []).slice(0, 35).forEach((prod) => {
        if (prod.slug) targetUrls.push(`${host}/product/${prod.slug}`);
      });

      this.addLog('INFO', `Crawling ${targetUrls.length} key routes & API endpoints...`);

      let crawledCount = 0;
      let failedCount = 0;

      // Concurrent request pool helper (concurrency limit = 4)
      const concurrencyLimit = 4;
      const queue = [...targetUrls];

      const worker = async () => {
        while (queue.length > 0) {
          const url = queue.shift();
          if (!url) break;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const res = await fetch(url, {
              method: 'GET',
              headers: { 'User-Agent': 'AceGarment-CacheCrawler/1.0' },
              signal: controller.signal,
              cache: 'no-cache',
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              crawledCount++;
            } else {
              failedCount++;
              this.addLog('WARN', `Crawler received ${res.status} for ${url}`);
            }
          } catch (e: any) {
            failedCount++;
            this.addLog('WARN', `Crawl timeout/error for ${url}: ${e?.message || e}`);
          }
        }
      };

      const workers = Array.from({ length: concurrencyLimit }, () => worker());
      await Promise.all(workers);

      const durationMs = Date.now() - start;
      this.lastCrawlDurationMs = durationMs;
      this.totalCrawlRuns++;
      this.totalUrlsCrawled += crawledCount;
      this.failedUrlsCount += failedCount;
      this.status = 'IDLE';

      this.addLog(
        'SUCCESS',
        `Cache crawl completed! Crawled ${crawledCount} URLs successfully (${failedCount} failed) in ${durationMs}ms`
      );

      return { success: true, crawledCount, failedCount, durationMs };
    } catch (err: any) {
      this.status = 'IDLE';
      this.addLog('ERROR', `Route crawling failed: ${err?.message || err}`);
      return { success: false, crawledCount: 0, failedCount: 1, durationMs: Date.now() - start };
    }
  }

  /**
   * Complete Pre-warm & Crawl sequence
   */
  public async warmupAll(options: { crawlRoutes?: boolean; force?: boolean } = {}) {
    const { crawlRoutes = true, force = true } = options;
    await this.warmEntities(force);
    if (crawlRoutes) {
      await this.crawlRoutes();
    }
  }

  /**
   * Schedule debounced pre-warm execution after a database mutation
   */
  public triggerWarmupDebounced(delayMs = 1500) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.addLog('INFO', `Database mutation detected. Scheduling debounced cache pre-warm in ${delayMs}ms...`);
    this.debounceTimer = setTimeout(() => {
      this.warmEntities(true).catch((err) => {
        this.addLog('ERROR', `Debounced pre-warm failed: ${err?.message || err}`);
      });
    }, delayMs);
  }

  /**
   * Start recurring daemon timer to periodically refresh cache
   */
  public startDaemon(intervalMinutes = 5) {
    if (this.daemonIntervalId) {
      clearInterval(this.daemonIntervalId);
    }
    const ms = intervalMinutes * 60 * 1000;
    this.daemonIntervalId = setInterval(() => {
      this.addLog('INFO', `Periodic daemon timer triggered (${intervalMinutes}m interval). Executing cache warm...`);
      this.warmupAll({ crawlRoutes: false, force: false }).catch((e) => {
        this.addLog('ERROR', `Daemon pre-warm error: ${e?.message || e}`);
      });
    }, ms);
    this.addLog('INFO', `Background Cache Daemon active (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Stop recurring daemon timer
   */
  public stopDaemon() {
    if (this.daemonIntervalId) {
      clearInterval(this.daemonIntervalId);
      this.daemonIntervalId = null;
      this.addLog('INFO', 'Background Cache Daemon stopped');
    }
  }

  /**
   * Retrieve prewarmer telemetry and log history
   */
  public getStats(): PrewarmerStats {
    return {
      status: this.status,
      lastWarmedAt: this.lastWarmedAt,
      lastCrawlDurationMs: this.lastCrawlDurationMs,
      totalWarmRuns: this.totalWarmRuns,
      totalCrawlRuns: this.totalCrawlRuns,
      totalUrlsCrawled: this.totalUrlsCrawled,
      failedUrlsCount: this.failedUrlsCount,
      daemonActive: this.daemonIntervalId !== null,
      logs: [...this.logs],
    };
  }
}

const globalPrewarmer = (globalThis as any).__aceCachePrewarmer || new CachePrewarmer();
if (process.env.NODE_ENV !== 'production') {
  (globalThis as any).__aceCachePrewarmer = globalPrewarmer;
}

export const cachePrewarmer = globalPrewarmer as CachePrewarmer;
