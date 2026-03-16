import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { getContextWindow } from '../utils/renderer';

export class ContextPercentageUsableWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows percentage of usable context window used or remaining (before auto-compact)'; }
    getDisplayName(): string { return 'Context % (usable)'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'remaining-plain', label: '88%' },
            { id: 'remaining-left-suffix', label: '88% left' },
            { id: 'remaining-short', label: 'Left: 88%' },
            { id: 'remaining-long', label: 'Usable remaining: 88%' },
            { id: 'used-plain', label: '12%' },
            { id: 'used-short', label: 'Used: 12%' },
            { id: 'used-long', label: 'Usable used: 12%' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Determine style (with backward compatibility)
        let style = item.displayStyle;
        if (!style) {
            const isInverse = item.metadata?.inverse === 'true';
            if (isInverse) {
                style = item.rawValue ? 'remaining-plain' : 'remaining-short';
            } else {
                style = item.rawValue ? 'used-plain' : 'used-short';
            }
        }

        // Calculate percentages
        let usedPercentage: number;
        let remainingPercentage: number;

        if (context.isPreview) {
            usedPercentage = 11.6;
            remainingPercentage = 88.4;
        } else if (context.tokenMetrics) {
            const usableWindow = Math.floor(getContextWindow(context.data?.model?.id) * 0.835);
            usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / usableWindow) * 100);
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
            return `Usable remaining: ${this.formatContextPercentage(remainingPercentage)}`;
        case 'used-plain':
            return this.formatContextPercentage(usedPercentage);
        case 'used-short':
            return `Used: ${this.formatContextPercentage(usedPercentage)}`;
        case 'used-long':
            return `Usable used: ${this.formatContextPercentage(usedPercentage)}`;
        default:
            return this.formatContextPercentage(usedPercentage);
        }
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