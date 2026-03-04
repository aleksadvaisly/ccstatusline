import {
    execFileSync,
    spawn
} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_DIR = path.join(os.homedir(), '.ccstatusline');
const USAGE_CACHE_PATH = path.join(USAGE_DIR, 'usage.json');
const USAGE_CACHE_TMP_PATH = path.join(USAGE_DIR, 'usage.json.tmp');
const USAGE_LOCK_PATH = path.join(USAGE_DIR, 'usage.lock');
const USAGE_SCRIPT_PATH = path.join(USAGE_DIR, 'cc-usage-tmux.sh');
const FRESH_CACHE_MS = 10 * 60 * 1000;
const STALE_LOCK_MS = 5 * 60 * 1000;

const REFRESH_WORKER_CODE = `
const { spawnSync } = require('child_process');
const fs = require('fs');
const [scriptPath, tempPath, cachePath, lockPath] = process.argv.slice(1);
try {
    const result = spawnSync('bash', [scriptPath], {
        encoding: 'utf8',
        timeout: ${STALE_LOCK_MS},
        stdio: ['ignore', 'pipe', 'ignore']
    });

    if (result.status === 0 && result.stdout && result.stdout.trim()) {
        fs.writeFileSync(tempPath, result.stdout, 'utf8');
        fs.renameSync(tempPath, cachePath);
    }
} catch {
    // Ignore refresh failures and keep the previous cache.
}

try {
    fs.unlinkSync(tempPath);
} catch {
    // Ignore temp cleanup failures.
}

try {
    fs.unlinkSync(lockPath);
} catch {
    // Ignore lock cleanup failures.
}
`;

export interface CCUsageStatus {
    timestamp?: string;
    weeklyPercent?: number;
    weeklyReset?: string;
    weeklyResetCli?: string;
    sessionPercent?: number;
    sessionReset?: string;
    sessionResetCli?: string;
    model?: string;
    effort?: string;
}

const BUILTIN_CCUSAGE_SAMPLE: CCUsageStatus = {
    timestamp: '2026-03-04T11:58:04+01:00',
    weeklyPercent: 51,
    weeklyReset: 'Resets Fri 8:00am',
    weeklyResetCli: 'Resets Mar 6 at 8am',
    sessionPercent: 9,
    sessionReset: 'Resets in 4h 2m',
    sessionResetCli: 'Resets 4pm',
    model: 'Sonnet 4.5',
    effort: 'Medium'
};

export interface TmuxStatus {
    available: boolean;
    installHints: string[];
}

let cachedTmuxStatus: TmuxStatus | null = null;

export function installCCUsageScript(): boolean {
    fs.mkdirSync(USAGE_DIR, { recursive: true });

    const sourcePath = getPackagedUsageScriptPath();
    if (!sourcePath)
        return false;

    try {
        fs.copyFileSync(sourcePath, USAGE_SCRIPT_PATH);
        fs.chmodSync(USAGE_SCRIPT_PATH, 0o755);
        return true;
    } catch {
        return false;
    }
}

interface LockState {
    timestamp: string;
    timestampMs: number;
}

export function getCCUsageStatus(): CCUsageStatus | null {
    fs.mkdirSync(USAGE_DIR, { recursive: true });

    const cached = readUsageCache();
    if (isFresh(cached))
        return cached;

    const lockState = readLockState();
    if (lockState) {
        if (isLockStale(lockState)) {
            clearStaleRunner();
        } else {
            return cached;
        }
    }

    if (!fs.existsSync(USAGE_SCRIPT_PATH))
        return cached;

    if (!tryAcquireLock())
        return cached;

    launchRefresh();
    return cached;
}

export function getCCUsageStatusForPreview(): CCUsageStatus {
    const current = readUsageCache();
    if (!current)
        return { ...BUILTIN_CCUSAGE_SAMPLE };

    return {
        timestamp: current.timestamp ?? BUILTIN_CCUSAGE_SAMPLE.timestamp,
        weeklyPercent: current.weeklyPercent ?? BUILTIN_CCUSAGE_SAMPLE.weeklyPercent,
        weeklyReset: current.weeklyReset ?? BUILTIN_CCUSAGE_SAMPLE.weeklyReset,
        weeklyResetCli: current.weeklyResetCli ?? BUILTIN_CCUSAGE_SAMPLE.weeklyResetCli,
        sessionPercent: current.sessionPercent ?? BUILTIN_CCUSAGE_SAMPLE.sessionPercent,
        sessionReset: current.sessionReset ?? BUILTIN_CCUSAGE_SAMPLE.sessionReset,
        sessionResetCli: current.sessionResetCli ?? BUILTIN_CCUSAGE_SAMPLE.sessionResetCli,
        model: current.model ?? BUILTIN_CCUSAGE_SAMPLE.model,
        effort: current.effort ?? BUILTIN_CCUSAGE_SAMPLE.effort
    };
}

export function getTmuxStatus(): TmuxStatus {
    if (cachedTmuxStatus)
        return cachedTmuxStatus;

    let available = false;
    try {
        execFileSync('tmux', ['-V'], { stdio: ['ignore', 'ignore', 'ignore'] });
        available = true;
    } catch {
        available = false;
    }

    cachedTmuxStatus = {
        available,
        installHints: [
            'macOS: brew install tmux',
            'Linux (Debian/Ubuntu): sudo apt update && sudo apt install -y tmux',
            'Linux (Fedora/RHEL): sudo dnf install tmux'
        ]
    };

    return cachedTmuxStatus;
}

function readUsageCache(): CCUsageStatus | null {
    try {
        const raw = fs.readFileSync(USAGE_CACHE_PATH, 'utf8');
        return parseUsageJson(raw);
    } catch {
        return null;
    }
}

function parseUsageJson(raw: string): CCUsageStatus | null {
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        return {
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : undefined,
            weeklyPercent: typeof parsed.weekly_percent === 'number' ? parsed.weekly_percent : undefined,
            weeklyReset: typeof parsed.weekly_reset === 'string' ? parsed.weekly_reset : undefined,
            weeklyResetCli: typeof parsed.weekly_reset_cli === 'string' ? parsed.weekly_reset_cli : undefined,
            sessionPercent: typeof parsed.session_percent === 'number' ? parsed.session_percent : undefined,
            sessionReset: typeof parsed.session_reset === 'string' ? parsed.session_reset : undefined,
            sessionResetCli: typeof parsed.session_reset_cli === 'string' ? parsed.session_reset_cli : undefined,
            model: typeof parsed.model === 'string' ? parsed.model : undefined,
            effort: typeof parsed.effort === 'string' ? parsed.effort : undefined
        };
    } catch {
        return null;
    }
}

function isFresh(status: CCUsageStatus | null): boolean {
    if (!status?.timestamp)
        return false;

    const timestampMs = Date.parse(status.timestamp);
    if (!Number.isFinite(timestampMs))
        return false;

    return Date.now() - timestampMs < FRESH_CACHE_MS;
}

function readLockState(): LockState | null {
    try {
        const raw = fs.readFileSync(USAGE_LOCK_PATH, 'utf8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;

        if (typeof parsed.timestamp === 'string') {
            const timestampMs = Date.parse(parsed.timestamp);
            if (!Number.isFinite(timestampMs))
                return null;

            return {
                timestamp: parsed.timestamp,
                timestampMs
            };
        }

        if (typeof parsed.startedAt === 'number') {
            const timestamp = formatTimestamp(new Date(parsed.startedAt));
            return {
                timestamp,
                timestampMs: parsed.startedAt
            };
        }

        return null;
    } catch {
        return null;
    }
}

function isLockStale(lockState: LockState): boolean {
    return Date.now() - lockState.timestampMs >= STALE_LOCK_MS;
}

function tryAcquireLock(): boolean {
    try {
        const fd = fs.openSync(USAGE_LOCK_PATH, 'wx');
        fs.writeFileSync(fd, `${JSON.stringify({ timestamp: formatTimestamp(new Date()) })}\n`, 'utf8');
        fs.closeSync(fd);
        return true;
    } catch {
        return false;
    }
}

function launchRefresh(): void {
    try {
        const child = spawn(process.execPath, [
            '-e',
            REFRESH_WORKER_CODE,
            USAGE_SCRIPT_PATH,
            USAGE_CACHE_TMP_PATH,
            USAGE_CACHE_PATH,
            USAGE_LOCK_PATH
        ], {
            detached: true,
            stdio: 'ignore'
        });

        child.unref();
    } catch {
        releaseLock();
    }
}

function releaseLock(): void {
    try {
        fs.unlinkSync(USAGE_LOCK_PATH);
    } catch {
        // Ignore missing lock cleanup failures.
    }
}

function clearStaleRunner(): void {
    try {
        execFileSync('pkill', ['-9', '-f', USAGE_SCRIPT_PATH], { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
        // Ignore when no stale runner exists.
    }

    releaseLock();
}

function getPackagedUsageScriptPath(): string | null {
    const candidates = [
        path.join(__dirname, '..', '..', 'scripts', 'cc-usage-tmux.sh'),
        path.join(__dirname, 'cc-usage-tmux.sh')
    ];

    return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function formatTimestamp(date: Date): string {
    const timezoneOffsetMinutes = -date.getTimezoneOffset();
    const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';
    const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60);
    const offsetMinutes = Math.abs(timezoneOffsetMinutes) % 60;
    const isoDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
    const isoTime = [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0'),
        String(date.getSeconds()).padStart(2, '0')
    ].join(':');
    const isoOffset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

    return `${isoDate}T${isoTime}${isoOffset}`;
}