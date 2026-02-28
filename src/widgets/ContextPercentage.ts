import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

const CONTEXT_SCALING_FACTOR = 1.04;
const CC_USAGE_STATUS_PATH = path.join(os.homedir(), '.cc-usage', 'status.json');

interface CCUsageStatus {
    weeklyPercent?: number;
    weeklyReset?: string;
    sessionPercent?: number;
    sessionReset?: string;
}

export class ContextPercentageWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows context usage percentage (200k window) or ccusage weekly/session reset metrics'; }
    getDisplayName(): string { return 'Context %'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'remaining-plain', label: '91%' },
            { id: 'remaining-left-suffix', label: '91% left' },
            { id: 'remaining-short', label: 'Left: 91%' },
            { id: 'remaining-long', label: 'Context remaining: 91%' },
            { id: 'used-plain', label: '9%' },
            { id: 'used-short', label: 'Used: 9%' },
            { id: 'used-long', label: 'Context used: 9%' },
            { id: 'weekly-used-reset', label: 'weekly 10% Fri 8:00 AM' },
            { id: 'weekly-left-reset', label: 'weekly 90% Fri 8:00 AM (left)' },
            { id: 'session-reset-used', label: '1 hr 37 min 31%' },
            { id: 'session-reset-left', label: '1 hr 37 min 69% (left)' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Determine style (with backward compatibility)
        let style = item.displayStyle;
        if (!style) {
            // Legacy: metadata.inverse was used before styles
            const isInverse = item.metadata?.inverse === 'true';
            if (isInverse) {
                style = item.rawValue ? 'remaining-plain' : 'remaining-short';
            } else {
                style = item.rawValue ? 'used-plain' : 'used-short';
            }
        }

        const isWeeklyStyle = style === 'weekly-used-reset' || style === 'weekly-left-reset';
        const isSessionStyle = style === 'session-reset-used' || style === 'session-reset-left';
        const isLeftStyle = style === 'weekly-left-reset' || style === 'session-reset-left';

        if (isWeeklyStyle || isSessionStyle) {
            if (context.isPreview) {
                if (style === 'weekly-used-reset')
                    return 'weekly 10% Fri 8:00 AM';
                if (style === 'weekly-left-reset')
                    return 'weekly 90% Fri 8:00 AM';
                if (style === 'session-reset-left')
                    return '1 hr 37 min 69%';
                return '1 hr 37 min 31%';
            }

            const usageStatus = this.getCCUsageStatus();
            if (!usageStatus)
                return null;

            if (isWeeklyStyle) {
                if (typeof usageStatus.weeklyPercent !== 'number' || !usageStatus.weeklyReset)
                    return null;

                const percent = this.getDisplayPercent(usageStatus.weeklyPercent, isLeftStyle);
                return `weekly ${this.formatPercent(percent)} ${this.cleanResetText(usageStatus.weeklyReset)}`;
            }

            if (typeof usageStatus.sessionPercent !== 'number' || !usageStatus.sessionReset)
                return null;

            const percent = this.getDisplayPercent(usageStatus.sessionPercent, isLeftStyle);
            return `${this.cleanResetText(usageStatus.sessionReset)} ${this.formatPercent(percent)}`;
        }

        // Calculate percentages
        let usedPercentage: number;
        let remainingPercentage: number;

        if (context.isPreview) {
            usedPercentage = 9.3;
            remainingPercentage = 90.7;
        } else if (context.tokenMetrics) {
            usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / 200000) * 100 * CONTEXT_SCALING_FACTOR);
            remainingPercentage = 100 - usedPercentage;
        } else {
            return null;
        }

        // Format based on style
        switch (style) {
        case 'remaining-plain':
            return `${remainingPercentage.toFixed(1)}%`;
        case 'remaining-left-suffix':
            return `${remainingPercentage.toFixed(1)}% left`;
        case 'remaining-short':
            return `Left: ${remainingPercentage.toFixed(1)}%`;
        case 'remaining-long':
            return `Context remaining: ${remainingPercentage.toFixed(1)}%`;
        case 'used-plain':
            return `${usedPercentage.toFixed(1)}%`;
        case 'used-short':
            return `Used: ${usedPercentage.toFixed(1)}%`;
        case 'used-long':
            return `Context used: ${usedPercentage.toFixed(1)}%`;
        default:
            return `${usedPercentage.toFixed(1)}%`;
        }
    }

    private getCCUsageStatus(): CCUsageStatus | null {
        try {
            const rawStatus = fs.readFileSync(CC_USAGE_STATUS_PATH, 'utf8');
            const parsed = JSON.parse(rawStatus) as Record<string, unknown>;

            return {
                weeklyPercent: typeof parsed.weekly_percent === 'number' ? parsed.weekly_percent : undefined,
                weeklyReset: typeof parsed.weekly_reset === 'string' ? parsed.weekly_reset : undefined,
                sessionPercent: typeof parsed.session_percent === 'number' ? parsed.session_percent : undefined,
                sessionReset: typeof parsed.session_reset === 'string' ? parsed.session_reset : undefined
            };
        } catch {
            return null;
        }
    }

    private cleanResetText(resetText: string): string {
        const withoutPrefix = resetText
            .replace(/^Resets in /, '')
            .replace(/^Resets /, '')
            .trim();

        return withoutPrefix
            .replace(/\b(\d+)\s*hrs?\b/gi, '$1h')
            .replace(/\b(\d+)\s*hours?\b/gi, '$1h')
            .replace(/\b(\d+)\s*mins?\b/gi, '$1m')
            .replace(/\b(\d+)\s*minutes?\b/gi, '$1m')
            .replace(/\b(\d+)\s*secs?\b/gi, '$1s')
            .replace(/\b(\d+)\s*seconds?\b/gi, '$1s')
            .replace(/\s+([ap]m)\b/gi, (_match: string, meridiem: string) => meridiem.toUpperCase())
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    private formatPercent(percent: number): string {
        return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(1).replace(/\.0$/, '')}%`;
    }

    private getDisplayPercent(percent: number, isLeft: boolean): number {
        if (!isLeft)
            return percent;

        return Math.max(0, Math.min(100, 100 - percent));
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}