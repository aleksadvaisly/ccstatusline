import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import {
    getCCUsageStatus,
    getCCUsageStatusForPreview
} from '../utils/ccusage';

type WeeklyUsageStyle = 'used-reset' | 'left-reset' | 'used-reset-cli' | 'left-reset-cli' | 'used-only' | 'left-only' | 'reset-only' | 'reset-cli-only';

export class WeeklyUsageWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows weekly usage percentage and weekly reset time from cc /usage (ccusage)'; }
    getDisplayName(): string { return 'Weekly Usage (cc /usage)'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'used-reset', label: 'weekly 51% Fri 8:00AM' },
            { id: 'left-reset', label: 'weekly 49% Fri 8:00AM (left)' },
            { id: 'used-reset-cli', label: 'weekly 51% Mar 6 at 8AM' },
            { id: 'left-reset-cli', label: 'weekly 49% Mar 6 at 8AM (left)' },
            { id: 'used-only', label: 'weekly 51%' },
            { id: 'left-only', label: 'weekly 49% left' },
            { id: 'reset-only', label: 'weekly Fri 8:00AM' },
            { id: 'reset-cli-only', label: 'weekly Mar 6 at 8AM' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const style = this.normalizeStyle(item.displayStyle);

        if (context.isPreview) {
            const usageStatus = getCCUsageStatusForPreview();
            return this.renderFromUsage(
                style,
                usageStatus.weeklyPercent,
                usageStatus.weeklyReset,
                usageStatus.weeklyResetCli
            );
        }

        const usageStatus = getCCUsageStatus();
        if (!usageStatus)
            return null;

        return this.renderFromUsage(style, usageStatus.weeklyPercent, usageStatus.weeklyReset, usageStatus.weeklyResetCli);
    }

    private normalizeStyle(style: string | undefined): WeeklyUsageStyle {
        switch (style) {
        case 'used':
            return 'used-reset';
        case 'left':
            return 'left-reset';
        case 'used-reset':
        case 'left-reset':
        case 'used-reset-cli':
        case 'left-reset-cli':
        case 'used-only':
        case 'left-only':
        case 'reset-only':
        case 'reset-cli-only':
            return style;
        default:
            return 'used-reset';
        }
    }

    private renderFromUsage(
        style: WeeklyUsageStyle,
        weeklyPercent: number | undefined,
        weeklyReset: string | undefined,
        weeklyResetCli: string | undefined
    ): string | null {
        const needsPercent = style.startsWith('used') || style.startsWith('left');
        const needsReset = style.includes('reset');
        const useCliReset = style.includes('-cli');
        const resetSource = useCliReset
            ? (weeklyResetCli ?? weeklyReset)
            : (weeklyReset ?? weeklyResetCli);

        if (needsPercent && typeof weeklyPercent !== 'number')
            return null;
        if (needsReset && !resetSource)
            return null;

        const usedPercent = this.formatPercent(weeklyPercent ?? 0);
        const leftPercent = this.formatPercent(this.getDisplayPercent(weeklyPercent ?? 0, true));
        const resetText = resetSource ? this.cleanResetText(resetSource) : '';

        switch (style) {
        case 'used-reset':
        case 'used-reset-cli':
            return `weekly ${usedPercent} ${resetText}`;
        case 'left-reset':
        case 'left-reset-cli':
            return `weekly ${leftPercent} ${resetText}`;
        case 'used-only':
            return `weekly ${usedPercent}`;
        case 'left-only':
            return `weekly ${leftPercent} left`;
        case 'reset-only':
        case 'reset-cli-only':
            return `weekly ${resetText}`;
        default:
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
            .replace(/([0-9:])\s*([ap]m)\b/gi, (_match: string, prefix: string, meridiem: string) => `${prefix}${meridiem.toUpperCase()}`)
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