import { readFileSync } from "fs";
import { execSync } from "child_process";

interface MemStats {
  totalMb: number;
  usedMb: number;
  freeMb: number;
  availableMb: number;
  usedPercent: number;
}

interface CpuStats {
  cpuPercent: number;
}

interface DiskInfo {
  totalGb: number;
  usedGb: number;
  freeGb: number;
  usedPercent: number;
}

interface DiskStats {
  disk: DiskInfo;
  mediaDisk: DiskInfo | null;
}

function getLinuxMemStats(): MemStats {
  const content = readFileSync("/proc/meminfo", "utf8");
  const parse = (key: string) => {
    const match = content.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
    return match ? parseInt(match[1], 10) * 1024 : 0;
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
  const pageSize = 16384;
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

function readCpuTimes(): number[] {
  const line = readFileSync("/proc/stat", "utf8").split("\n")[0];
  return line.split(/\s+/).slice(1).map(Number);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getLinuxCpuStats(): Promise<CpuStats> {
  const t1 = readCpuTimes();
  await sleep(200);
  const t2 = readCpuTimes();

  const idle1 = t1[3];
  const idle2 = t2[3];
  const total1 = t1.reduce((a, b) => a + b, 0);
  const total2 = t2.reduce((a, b) => a + b, 0);

  const idleDelta = idle2 - idle1;
  const totalDelta = total2 - total1;

  return {
    cpuPercent: Math.round(((totalDelta - idleDelta) / totalDelta) * 100),
  };
}

async function getMacCpuStats(): Promise<CpuStats> {
  const out = execSync("top -l 1 -n 0 | grep 'CPU usage'").toString();
  const match = out.match(/([\d.]+)%\s+user.*?([\d.]+)%\s+sys/);
  if (!match) return { cpuPercent: 0 };
  return { cpuPercent: Math.round(parseFloat(match[1]) + parseFloat(match[2])) };
}

function parseDfMount(mount: string): DiskInfo | null {
  try {
    const out = execSync(`df -k ${mount}`).toString();
    const parts = out.trim().split("\n")[1].split(/\s+/);
    const totalKb = parseInt(parts[1], 10);
    const freeKb = parseInt(parts[3], 10);
    const usedKb = totalKb - freeKb;
    const toGb = (kb: number) => parseFloat((kb / 1024 / 1024).toFixed(1));
    return {
      totalGb: toGb(totalKb),
      usedGb: toGb(usedKb),
      freeGb: toGb(freeKb),
      usedPercent: Math.round((usedKb / totalKb) * 100),
    };
  } catch {
    return null;
  }
}

function getDiskStats(): DiskStats {
  return {
    disk: parseDfMount("/")!,
    mediaDisk: parseDfMount("/mnt/media"),
  };
}

export async function GET() {
  try {
    const isLinux = process.platform === "linux";
    const [mem, cpu] = await Promise.all([
      isLinux ? getLinuxMemStats() : getMacMemStats(),
      isLinux ? getLinuxCpuStats() : getMacCpuStats(),
    ]);
    const disk = getDiskStats();

    return Response.json({
      ok: true,
      platform: process.platform,
      ...mem,
      ...cpu,
      disk: disk.disk,
      mediaDisk: disk.mediaDisk,
    });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
