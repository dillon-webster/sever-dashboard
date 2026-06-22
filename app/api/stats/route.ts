import { readFileSync } from "fs";
import { execSync } from "child_process";

interface MemStats {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  availableMb: number;
  usedPercent: number;
}

function getLinuxMemStats(): MemStats {
  const content = readFileSync("/proc/meminfo", "utf8");
  const parse = (key: string) => {
    const match = content.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
    return match ? parseInt(match[1], 10) * 1024 : 0; // kB → bytes
  };

  const totalBytes = parse("MemTotal");
  const freeBytes = parse("MemFree");
  const availableBytes = parse("MemAvailable");
  const usedBytes = totalBytes - availableBytes;

  const toMb = (b: number) => Math.round(b / 1024 / 1024);

  return {
    totalMb: toMb(totalBytes),
    usedMb: toMb(usedBytes),
    freeMb: toMb(freeBytes),
    availableMb: toMb(availableBytes),
    usedPercent: Math.round((usedBytes / totalBytes) * 100),
  };
}

function getMacMemStats(): MemStats {
  const vmStat = execSync("vm_stat").toString();
  const sysctl = execSync("sysctl -n hw.memsize").toString().trim();

  const pageSize = 16384; // macOS default 16KB pages
  const parse = (key: string) => {
    const match = vmStat.match(new RegExp(`${key}:\\s+([\\d]+)`));
    return match ? parseInt(match[1], 10) * pageSize : 0;
  };

  const totalBytes = parseInt(sysctl, 10);
  const freeBytes = parse("Pages free");
  const inactiveBytes = parse("Pages inactive");
  const availableBytes = freeBytes + inactiveBytes;
  const usedBytes = totalBytes - availableBytes;

  const toMb = (b: number) => Math.round(b / 1024 / 1024);

  return {
    totalMb: toMb(totalBytes),
    usedMb: toMb(usedBytes),
    freeMb: toMb(freeBytes),
    availableMb: toMb(availableBytes),
    usedPercent: Math.round((usedBytes / totalBytes) * 100),
  };
}

export async function GET() {
  try {
    const stats =
      process.platform === "linux" ? getLinuxMemStats() : getMacMemStats();

    return Response.json({ ok: true, ...stats, platform: process.platform });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
