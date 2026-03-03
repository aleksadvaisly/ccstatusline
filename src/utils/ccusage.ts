import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USAGE_DIR = path.join(os.homedir(), '.ccstatusline');
const USAGE_CACHE_PATH = path.join(USAGE_DIR, 'usage.json');
const USAGE_LOCK_PATH = path.join(USAGE_DIR, 'usage.lock');
const FRESH_CACHE_MS = 10 * 60 * 1000;
const STALE_LOCK_MS = 5 * 60 * 1000;

export interface CCUsageStatus {
    timestamp?: string;
    weeklyPercent?: number;
    weeklyReset?: string;
    sessionPercent?: number;
    sessionReset?: string;
}

interface LockState { startedAt: number }

export function getCCUsageStatus(): CCUsageStatus | null {
    fs.mkdirSync(USAGE_DIR, { recursive: true });

    const cached = readUsageCache();
    if (isFresh(cached))
        return cached;

    const lockState = readLockState();
    if (lockState && !isLockStale(lockState))
        return cached;

    if (lockState && isLockStale(lockState))
        clearStaleRunner();

    const lockAcquired = tryAcquireLock();
    if (!lockAcquired) {
        const activeLock = readLockState();
        if (activeLock && isLockStale(activeLock)) {
            clearStaleRunner();
            if (!tryAcquireLock())
                return readUsageCache();
        } else {
            return readUsageCache();
        }
    }

    try {
        const rawOutput = execFileSync('bash', [getUsageScriptPath()], {
            encoding: 'utf8',
            timeout: STALE_LOCK_MS,
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();

        const parsed = parseUsageJson(rawOutput);
        if (!parsed)
            return cached;

        fs.writeFileSync(USAGE_CACHE_PATH, `${JSON.stringify({
            timestamp: parsed.timestamp,
            weekly_percent: parsed.weeklyPercent ?? null,
            weekly_reset: parsed.weeklyReset ?? null,
            session_percent: parsed.sessionPercent ?? null,
            session_reset: parsed.sessionReset ?? null
        })}\n`, 'utf8');

        return parsed;
    } catch {
        return cached;
    } finally {
        releaseLock();
    }
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
            sessionPercent: typeof parsed.session_percent === 'number' ? parsed.session_percent : undefined,
            sessionReset: typeof parsed.session_reset === 'string' ? parsed.session_reset : undefined
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
        if (typeof parsed.startedAt !== 'number')
            return null;

        return { startedAt: parsed.startedAt };
    } catch {
        return null;
    }
}

function isLockStale(lockState: LockState): boolean {
    return Date.now() - lockState.startedAt >= STALE_LOCK_MS;
}

function tryAcquireLock(): boolean {
    try {
        const fd = fs.openSync(USAGE_LOCK_PATH, 'wx');
        fs.writeFileSync(fd, JSON.stringify({ startedAt: Date.now() }), 'utf8');
        fs.closeSync(fd);
        return true;
    } catch {
        return false;
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
        execFileSync('pkill', ['-9', '-f', path.basename(getUsageScriptPath())], { stdio: ['ignore', 'ignore', 'ignore'] });
    } catch {
        // Ignore when no stale runner exists.
    }

    releaseLock();
}

function getUsageScriptPath(): string {
    const candidates = [
        path.join(__dirname, '..', '..', 'scripts', 'cc-usage-tmux.sh'),
        path.join(__dirname, 'cc-usage-tmux.sh')
    ];

    const existing = candidates.find(candidate => fs.existsSync(candidate));
    return existing ?? path.join(__dirname, '..', '..', 'scripts', 'cc-usage-tmux.sh');
}