import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class WallClockWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows current local wall clock time and/or date'; }
    getDisplayName(): string { return 'Wall Clock'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'time-only', label: '23:12' },
            { id: 'date-only', label: 'Feb 12th' },
            { id: 'time-date', label: '23:12 Feb 12th' }
        ];
    }

    getEditorDisplay(_item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, _settings: Settings): string | null {
        const now = context.isPreview ? new Date(2026, 1, 12, 23, 12) : new Date();
        const style = item.displayStyle ?? 'time-date';
        const time = this.formatTime(now);
        const date = this.formatDate(now);

        switch (style) {
        case 'time-only':
            return time;
        case 'date-only':
            return date;
        case 'time-date':
        default:
            return `${time} ${date}`;
        }
    }

    private formatTime(date: Date): string {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    private formatDate(date: Date): string {
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = date.getDate();
        return `${month} ${day}${this.getOrdinalSuffix(day)}`;
    }

    private getOrdinalSuffix(day: number): string {
        const remainder100 = day % 100;
        if (remainder100 >= 11 && remainder100 <= 13)
            return 'th';

        switch (day % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
        }
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(_item: WidgetItem): boolean { return true; }
}