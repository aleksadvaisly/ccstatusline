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
const USAGE_SCRIPT_PATH = path.join(USAGE_DIR, 'cc-usage-tmux.sh');
const FRESH_CACHE_MS = 10 * 60 * 1000;

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

function slugifyCwd(cwd: string): string {
    const home = os.homedir();
    let p = cwd;
    if (p.startsWith(home + '/'))
        p = p.slice(home.length + 1);
    else if (p === home)
        p = '';
    if (p.startsWith('.ccstatusline'))
        return '';
    p = p.toLowerCase().replace(/[/ ]/g, '-');
    p = p.replace(/^-+/, '').replace(/-+$/, '');
    return p;
}

function usageCachePath(cwd?: string): string {
    if (!cwd)
        return path.join(USAGE_DIR, 'usage.json');
    const slug = slugifyCwd(cwd);
    if (!slug)
        return path.join(USAGE_DIR, 'usage.json');
    return path.join(USAGE_DIR, `usage-${slug}.json`);
}

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

export function getCCUsageStatus(cwd?: string): CCUsageStatus | null {
    fs.mkdirSync(USAGE_DIR, { recursive: true });

    const cachePath = usageCachePath(cwd);
    const cached = readUsageCache(cachePath);
    if (isFresh(cachePath))
        return cached;

    if (!fs.existsSync(USAGE_SCRIPT_PATH))
        return cached;

    launchRefresh(cwd);
    return cached;
}

export function getCCUsageStatusForPreview(): CCUsageStatus {
    const current = readUsageCache(usageCachePath());
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

function readUsageCache(cachePath: string): CCUsageStatus | null {
    try {
        const raw = fs.readFileSync(cachePath, 'utf8');
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

function isFresh(cachePath: string): boolean {
    try {
        const stat = fs.statSync(cachePath);
        return Date.now() - stat.mtimeMs < FRESH_CACHE_MS;
    } catch {
        return false;
    }
}

function launchRefresh(cwd?: string): void {
    try {
        const args = [USAGE_SCRIPT_PATH];
        if (cwd)
            args.push('--cwd', cwd);

        const child = spawn('bash', args, {
            detached: true,
            stdio: 'ignore'
        });

        child.unref();
    } catch {
        // Ignore refresh spawn failures.
    }
}

function getPackagedUsageScriptPath(): string | null {
    const candidates = [
        path.join(__dirname, '..', '..', 'scripts', 'cc-usage-tmux.sh'),
        path.join(__dirname, 'cc-usage-tmux.sh')
    ];

    return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}