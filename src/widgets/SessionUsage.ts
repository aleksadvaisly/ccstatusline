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

type SessionUsageStyle = 'reset-used' | 'reset-left' | 'reset-cli-used' | 'reset-cli-left' | 'used-only' | 'left-only' | 'reset-only' | 'reset-cli-only';

export class SessionUsageWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows current 5h usage percentage and reset time from cc /usage (ccusage)'; }
    getDisplayName(): string { return '5h Usage (cc /usage)'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'reset-used', label: '4h 2m 9%' },
            { id: 'reset-left', label: '4h 2m 91% (left)' },
            { id: 'reset-cli-used', label: '4PM 9%' },
            { id: 'reset-cli-left', label: '4PM 91% (left)' },
            { id: 'used-only', label: '9%' },
            { id: 'left-only', label: '91% left' },
            { id: 'reset-only', label: '4h 2m' },
            { id: 'reset-cli-only', label: '4PM' }
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
                usageStatus.sessionPercent,
                usageStatus.sessionReset,
                usageStatus.sessionResetCli
            );
        }

        const usageStatus = getCCUsageStatus();
        if (!usageStatus)
            return null;

        return this.renderFromUsage(style, usageStatus.sessionPercent, usageStatus.sessionReset, usageStatus.sessionResetCli);
    }

    private normalizeStyle(style: string | undefined): SessionUsageStyle {
        switch (style) {
        case 'used':
            return 'reset-used';
        case 'left':
            return 'reset-left';
        case 'reset-used':
        case 'reset-left':
        case 'reset-cli-used':
        case 'reset-cli-left':
        case 'used-only':
        case 'left-only':
        case 'reset-only':
        case 'reset-cli-only':
            return style;
        default:
            return 'reset-used';
        }
    }

    private renderFromUsage(
        style: SessionUsageStyle,
        sessionPercent: number | undefined,
        sessionReset: string | undefined,
        sessionResetCli: string | undefined
    ): string | null {
        const needsPercent = style === 'reset-used'
            || style === 'reset-left'
            || style === 'reset-cli-used'
            || style === 'reset-cli-left'
            || style === 'used-only'
            || style === 'left-only';
        const needsReset = style === 'reset-used'
            || style === 'reset-left'
            || style === 'reset-cli-used'
            || style === 'reset-cli-left'
            || style === 'reset-only'
            || style === 'reset-cli-only';
        const useCliReset = style.includes('-cli');
        const resetSource = useCliReset
            ? (sessionResetCli ?? sessionReset)
            : (sessionReset ?? sessionResetCli);

        if (needsPercent && typeof sessionPercent !== 'number')
            return null;
        if (needsReset && !resetSource)
            return null;

        const usedPercent = this.formatPercent(sessionPercent ?? 0);
        const leftPercent = this.formatPercent(this.getDisplayPercent(sessionPercent ?? 0, true));
        const resetText = resetSource ? this.cleanResetText(resetSource) : '';

        switch (style) {
        case 'reset-used':
        case 'reset-cli-used':
            return `${resetText} ${usedPercent}`;
        case 'reset-left':
        case 'reset-cli-left':
            return `${resetText} ${leftPercent}`;
        case 'used-only':
            return usedPercent;
        case 'left-only':
            return `${leftPercent} left`;
        case 'reset-only':
        case 'reset-cli-only':
            return resetText;
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