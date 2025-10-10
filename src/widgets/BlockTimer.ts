import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class BlockTimerWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows elapsed time since beginning of current 5hr block'; }
    getDisplayName(): string { return 'Block Timer'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'time-labeled', label: 'Block: 3hr 45m' },
            { id: 'time-plain', label: '3hr 45m' },
            { id: 'progress-labeled', label: 'Block [████████░░] 73.9%' },
            { id: 'progress-plain', label: '[████████░░] 73.9%' },
            { id: 'progress-short-labeled', label: 'Block [████░░] 73.9%' },
            { id: 'progress-short-plain', label: '[████░░] 73.9%' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return {
            displayText: this.getDisplayName()
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Determine style (with backward compatibility)
        let style = item.displayStyle;
        if (!style) {
            const mode = (item.metadata?.display ?? 'time');
            const isRaw = item.rawValue;
            if (mode === 'progress') {
                style = isRaw ? 'progress-plain' : 'progress-labeled';
            } else if (mode === 'progress-short') {
                style = isRaw ? 'progress-short-plain' : 'progress-short-labeled';
            } else {
                style = isRaw ? 'time-plain' : 'time-labeled';
            }
        }

        const isProgressStyle = style.startsWith('progress');
        const isShortBar = style.includes('short');
        const isLabeled = style.includes('labeled');

        if (context.isPreview) {
            if (isProgressStyle) {
                const bar = isShortBar ? '[███████░░░░░░░░] 73.9%' : '[██████████████████████░░░░░░░░] 73.9%';
                return isLabeled ? `Block ${bar}` : bar;
            }
            return isLabeled ? 'Block: 3hr 45m' : '3hr 45m';
        }

        // Check if we have block metrics in context
        const blockMetrics = context.blockMetrics;
        if (!blockMetrics) {
            // No active session - show empty progress bar or 0hr 0m
            if (isProgressStyle) {
                const barWidth = isShortBar ? 16 : 32;
                const emptyBar = '░'.repeat(barWidth);
                const bar = `[${emptyBar}] 0%`;
                return isLabeled ? `Block ${bar}` : bar;
            } else {
                return isLabeled ? 'Block: 0hr 0m' : '0hr 0m';
            }
        }

        try {
            // Calculate elapsed time and progress
            const now = new Date();
            const elapsedMs = now.getTime() - blockMetrics.startTime.getTime();
            const sessionDurationMs = 5 * 60 * 60 * 1000; // 5 hours
            const progress = Math.min(elapsedMs / sessionDurationMs, 1.0);
            const percentage = (progress * 100).toFixed(1);

            if (isProgressStyle) {
                const barWidth = isShortBar ? 16 : 32;
                const filledWidth = Math.floor(progress * barWidth);
                const emptyWidth = barWidth - filledWidth;
                const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
                const bar = `[${progressBar}] ${percentage}%`;
                return isLabeled ? `Block ${bar}` : bar;
            } else {
                // Time display mode
                const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
                const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

                let timeString: string;
                if (elapsedMinutes === 0) {
                    timeString = `${elapsedHours}hr`;
                } else {
                    timeString = `${elapsedHours}hr ${elapsedMinutes}m`;
                }

                return isLabeled ? `Block: ${timeString}` : timeString;
            }
        } catch {
            return null;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}