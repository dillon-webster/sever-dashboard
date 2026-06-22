"use client";

import { useEffect, useState, useCallback } from "react";

interface Stats {
  ok: boolean;
  totalMb: number;
  usedMb: number;
  freeMb: number;
  availableMb: number;
  usedPercent: number;
  cpuPercent: number;
  diskTotalGb: number;
  diskUsedGb: number;
  diskFreeGb: number;
  diskUsedPercent: number;
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
    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-yellow-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function MetricBlock({
  label,
  percent,
  primary,
  secondary,
}: {
  label: string;
  percent: number;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-white/50 uppercase tracking-widest">{label}</p>
          <p className="text-5xl font-bold mt-1">{percent}%</p>
        </div>
        <div className="text-right">
          <p className="text-white/60 text-sm">{primary}</p>
          <p className="text-white/30 text-xs mt-1">{secondary}</p>
        </div>
      </div>
      <BarMeter percent={percent} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
      <p className="text-sm text-white/50 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricBlock
              label="RAM"
              percent={stats.usedPercent}
              primary={`${formatMb(stats.usedMb)} / ${formatMb(stats.totalMb)}`}
              secondary={`${formatMb(stats.availableMb)} available`}
            />
            <MetricBlock
              label="CPU"
              percent={stats.cpuPercent}
              primary={`${stats.cpuPercent}% used`}
              secondary="across all cores"
            />
          </div>

          <MetricBlock
            label="Disk"
            percent={stats.diskUsedPercent}
            primary={`${stats.diskUsedGb} GB / ${stats.diskTotalGb} GB`}
            secondary={`${stats.diskFreeGb} GB free`}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total RAM" value={formatMb(stats.totalMb)} />
            <StatCard label="RAM Used" value={formatMb(stats.usedMb)} />
            <StatCard label="Disk Total" value={`${stats.diskTotalGb} GB`} />
            <StatCard label="Disk Free" value={`${stats.diskFreeGb} GB`} />
          </div>
        </>
      )}

      {!stats && !error && (
        <div className="text-white/30 text-sm animate-pulse">Loading…</div>
      )}
    </main>
  );
}
