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

export class ContextPercentageWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows percentage of context window used or remaining (of 200k tokens)'; }
    getDisplayName(): string { return 'Context %'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'remaining-plain', label: '91%' },
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

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}