import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { getCCUsageStatus } from '../utils/ccusage';

export class ContextPercentageWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows context usage percentage (200k window)'; }
    getDisplayName(): string { return 'Session Usage'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'remaining-plain', label: '91%' },
            { id: 'remaining-left-suffix', label: '91% left' },
            { id: 'remaining-short', label: 'Left: 91%' },
            { id: 'remaining-long', label: 'Context remaining: 91%' },
            { id: 'used-plain', label: '9%' },
            { id: 'used-short', label: 'Used: 9%' },
            { id: 'used-long', label: 'Context used: 9%' }
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

        // Legacy compatibility for existing configs that still use old ccusage styles
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

            const usageStatus = getCCUsageStatus();
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
            usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / 200000) * 100);
            remainingPercentage = 100 - usedPercentage;
        } else {
            return null;
        }

        // Format based on style
        switch (style) {
        case 'remaining-plain':
            return this.formatContextPercentage(remainingPercentage);
        case 'remaining-left-suffix':
            return `${this.formatContextPercentage(remainingPercentage)} left`;
        case 'remaining-short':
            return `Left: ${this.formatContextPercentage(remainingPercentage)}`;
        case 'remaining-long':
            return `Context remaining: ${this.formatContextPercentage(remainingPercentage)}`;
        case 'used-plain':
            return this.formatContextPercentage(usedPercentage);
        case 'used-short':
            return `Used: ${this.formatContextPercentage(usedPercentage)}`;
        case 'used-long':
            return `Context used: ${this.formatContextPercentage(usedPercentage)}`;
        default:
            return this.formatContextPercentage(usedPercentage);
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

    private formatContextPercentage(percent: number): string {
        return `${Math.round(percent)}%`;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}
