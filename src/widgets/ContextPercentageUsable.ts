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

export class ContextPercentageUsableWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows percentage of usable context window used or remaining (of 160k tokens before auto-compact)'; }
    getDisplayName(): string { return 'Context % (usable)'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'remaining-plain', label: '88%' },
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
            usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / 160000) * 100 * CONTEXT_SCALING_FACTOR);
            remainingPercentage = 100 - usedPercentage;
        } else {
            return null;
        }

        // Format based on style
        switch (style) {
        case 'remaining-plain':
            return `${remainingPercentage.toFixed(1)}%`;
        case 'remaining-short':
            return `Left: ${remainingPercentage.toFixed(1)}%`;
        case 'remaining-long':
            return `Usable remaining: ${remainingPercentage.toFixed(1)}%`;
        case 'used-plain':
            return `${usedPercentage.toFixed(1)}%`;
        case 'used-short':
            return `Used: ${usedPercentage.toFixed(1)}%`;
        case 'used-long':
            return `Usable used: ${usedPercentage.toFixed(1)}%`;
        default:
            return `${usedPercentage.toFixed(1)}%`;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}