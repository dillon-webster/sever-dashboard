"use client";

import { useEffect, useState, useCallback } from "react";

interface Stats {
  ok: boolean;
  totalMb: number;
  usedMb: number;
  freeMb: number;
  availableMb: number;
  usedPercent: number;
  platform: string;
  error?: string;
}

const REFRESH_INTERVAL_MS = 3000;

function formatMb(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function BarMeter({ percent }: { percent: number }) {
  const color =
    percent >= 90
      ? "bg-red-500"
      : percent >= 70
      ? "bg-yellow-400"
      : "bg-emerald-400";

  return (
    <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-1">
      <p className="text-sm text-white/50 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-sm text-white/40">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data: Stats = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Unknown error");
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8 flex flex-col gap-8 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Server Monitor</h1>
          {lastUpdated && (
            <p className="text-sm text-white/30 mt-1">
              Last updated {lastUpdated.toLocaleTimeString()} · refreshes every{" "}
              {REFRESH_INTERVAL_MS / 1000}s
            </p>
          )}
        </div>
        <span className="flex items-center gap-2 text-sm text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-white/50 uppercase tracking-widest">
                  RAM Usage
                </p>
                <p className="text-5xl font-bold mt-1">{stats.usedPercent}%</p>
              </div>
              <p className="text-white/40 text-sm">
                {formatMb(stats.usedMb)} / {formatMb(stats.totalMb)}
              </p>
            </div>
            <BarMeter percent={stats.usedPercent} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total RAM" value={formatMb(stats.totalMb)} />
            <StatCard label="Used" value={formatMb(stats.usedMb)} />
            <StatCard
              label="Available"
              value={formatMb(stats.availableMb)}
              sub="free + reclaimable"
            />
          </div>
        </>
      )}

      {!stats && !error && (
        <div className="text-white/30 text-sm animate-pulse">Loading…</div>
      )}
    </main>
  );
}
