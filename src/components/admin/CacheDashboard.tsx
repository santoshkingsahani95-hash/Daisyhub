'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, Flame, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, Activity, Database, Server, Terminal, Trash2 } from 'lucide-react';

interface EntityStats {
  itemCount: number;
  fetchedAt: number;
  ageSeconds: number;
  status: 'HOT' | 'STALE' | 'COLD';
  ttlMs: number;
}

interface TelemetryData {
  objectCache: {
    totalQueries: number;
    hits: number;
    misses: number;
    revalidations: number;
    hitRatioPercent: number;
    lastWarmedAt: number;
    entities: Record<string, EntityStats>;
  };
  crawler: {
    status: 'IDLE' | 'WARMING_ENTITIES' | 'CRAWLING_ROUTES';
    lastWarmedAt: number;
    lastCrawlDurationMs: number;
    totalWarmRuns: number;
    totalCrawlRuns: number;
    totalUrlsCrawled: number;
    failedUrlsCount: number;
    daemonActive: boolean;
    logs: Array<{ timestamp: string; type: string; message: string }>;
  };
}

export function CacheDashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/cache/stats', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (e) {
      console.error('Failed to fetch cache stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (!autoRefresh) return;
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleWarm = async (mode: 'full' | 'entities' | 'routes') => {
    setActionLoading(mode);
    try {
      const res = await fetch('/api/cache/warm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, force: true }),
      });
      if (res.ok) {
        await fetchStats();
      }
    } catch (e) {
      console.error('Failed to trigger warm:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async (entity: string = 'all') => {
    if (!confirm(`Purge ${entity} object cache and trigger background pre-warm?`)) return;
    setActionLoading(`purge_${entity}`);
    try {
      const res = await fetch('/api/cache/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, rewarm: true }),
      });
      if (res.ok) {
        await fetchStats();
      }
    } catch (e) {
      console.error('Failed to purge cache:', e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center justify-center space-x-3">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="font-medium text-lg">Initializing Cache Telemetry & Object Monitor...</span>
      </div>
    );
  }

  const cache = data?.objectCache;
  const crawler = data?.crawler;
  const entities = cache?.entities || {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-emerald-950/40 p-6 border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" /> High-Performance Object Cache
              </span>
              {crawler?.daemonActive && (
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Activity className="w-3 h-3 animate-pulse" /> Daemon Active
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Database Cache & Pre-Warming Engine</h2>
            <p className="text-sm text-neutral-400 mt-1">
              Granular MySQL object cache with SWR, single-flight query deduplication, and automated route crawler.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleWarm('full')}
              disabled={actionLoading !== null}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 flex items-center space-x-2 transition-all duration-200 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${actionLoading === 'full' ? 'animate-bounce' : ''}`} />
              <span>{actionLoading === 'full' ? 'Pre-Warming...' : '🔥 Warm Cache & Crawl'}</span>
            </button>

            <button
              onClick={() => handleWarm('routes')}
              disabled={actionLoading !== null}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-sm font-medium flex items-center space-x-2 transition-all duration-200 disabled:opacity-50"
            >
              <Cpu className={`w-4 h-4 text-emerald-400 ${actionLoading === 'routes' ? 'animate-spin' : ''}`} />
              <span>{actionLoading === 'routes' ? 'Crawling...' : '🕷️ Crawl Routes'}</span>
            </button>

            <button
              onClick={() => handlePurge('all')}
              disabled={actionLoading !== null}
              className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-sm font-medium transition-all duration-200 disabled:opacity-50"
              title="Purge All Caches"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hit Ratio Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Cache Hit Ratio</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{cache?.hitRatioPercent}%</span>
            <span className="text-xs text-neutral-400">({cache?.hits} hits / {cache?.misses} misses)</span>
          </div>
          <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, cache?.hitRatioPercent || 0))}%` }}
            />
          </div>
        </div>

        {/* Total Queries Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total DB Queries</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{cache?.totalQueries}</div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center space-x-1">
            <span className="text-emerald-400 font-semibold">{cache?.revalidations}</span>
            <span>background SWR revalidations</span>
          </div>
        </div>

        {/* Crawler Telemetry Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>URLs Crawled</span>
            <Server className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{crawler?.totalUrlsCrawled}</div>
          <div className="text-xs text-neutral-400 mt-2 flex items-center justify-between">
            <span>Last Duration: <strong className="text-neutral-200">{crawler?.lastCrawlDurationMs}ms</strong></span>
            {crawler?.failedUrlsCount ? (
              <span className="text-amber-400 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> {crawler.failedUrlsCount} err</span>
            ) : (
              <span className="text-emerald-400 font-semibold">0 errors</span>
            )}
          </div>
        </div>

        {/* Crawler Status Card */}
        <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Crawler Engine</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${crawler?.status === 'IDLE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
            <span className="text-lg font-bold text-white capitalize">{crawler?.status.replace('_', ' ').toLowerCase()}</span>
          </div>
          <div className="text-xs text-neutral-400 mt-2">
            Last Warmed:{' '}
            <strong className="text-neutral-200">
              {cache?.lastWarmedAt ? new Date(cache.lastWarmedAt).toLocaleTimeString() : 'Never'}
            </strong>
          </div>
        </div>
      </div>

      {/* Entity Cache Status Table */}
      <div className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" /> Database Entity Caches
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">Real-time status of independent MySQL object store memory pools</p>
          </div>
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/60 text-xs font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="py-3.5 px-5">Entity Pool</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Cached Items</th>
                <th className="py-3.5 px-5">Cache Age</th>
                <th className="py-3.5 px-5">Soft TTL</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {Object.entries(entities).map(([key, stat]) => {
                const statusColor =
                  stat.status === 'HOT'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : stat.status === 'STALE'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30';

                return (
                  <tr key={key} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-4 px-5 font-semibold text-white capitalize flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {key}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${statusColor}`}>
                        {stat.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-medium text-neutral-200">
                      {stat.itemCount} objects
                    </td>
                    <td className="py-4 px-5 text-neutral-400">
                      {stat.ageSeconds < 0 ? 'Just warmed' : `${stat.ageSeconds}s ago`}
                    </td>
                    <td className="py-4 px-5 text-neutral-400">
                      {(stat.ttlMs / 1000).toFixed(0)}s
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => handlePurge(key)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-red-950 hover:text-red-300 text-neutral-400 border border-neutral-700 transition-colors"
                      >
                        Purge
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Crawler Console / Event Log */}
      <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Cache Crawler Event Log</h3>
          </div>
          <span className="text-xs text-neutral-500">{crawler?.logs.length || 0} events recorded</span>
        </div>

        <div className="bg-black/80 rounded-xl p-4 font-mono text-xs text-neutral-300 max-h-60 overflow-y-auto space-y-1.5 border border-neutral-900">
          {crawler?.logs && crawler.logs.length > 0 ? (
            crawler.logs.map((log, i) => {
              const color =
                log.type === 'SUCCESS'
                  ? 'text-emerald-400'
                  : log.type === 'WARN'
                  ? 'text-amber-400'
                  : log.type === 'ERROR'
                  ? 'text-red-400 font-bold'
                  : 'text-blue-400';

              return (
                <div key={i} className="flex items-start space-x-2 leading-relaxed">
                  <span className="text-neutral-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-bold ${color}`}>[{log.type}]</span>
                  <span className="text-neutral-300 break-all">{log.message}</span>
                </div>
              );
            })
          ) : (
            <div className="text-neutral-500 italic py-2">No crawler events recorded yet. Click 'Warm Cache & Crawl' to trigger runs.</div>
          )}
        </div>
      </div>
    </div>
  );
}
