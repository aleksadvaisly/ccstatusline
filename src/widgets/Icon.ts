import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class IconWidget implements Widget {
    getDefaultColor(): string { return 'white'; }
    getDescription(): string { return 'Displays a decorative icon'; }
    getDisplayName(): string { return 'Icon'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'folder', label: '📁' },
            { id: 'lightning', label: '⚡' },
            { id: 'chart', label: '📊' },
            { id: 'clock', label: '🕐' },
            { id: 'wrench', label: '🔧' },
            { id: 'gear', label: '⚙' },
            { id: 'brain', label: '🧠' },
            { id: 'page', label: '📄' },
            { id: 'pencil', label: '✏' },
            { id: 'magnifier', label: '🔍' },
            { id: 'flag', label: '🏁' },
            { id: 'eye', label: '👀' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const style = item.displayStyle || 'folder';
        const icon = this.getAvailableStyles().find(s => s.id === style)?.label || '📁';
        return { displayText: `${this.getDisplayName()} (${icon})` };
    }

    render(item: WidgetItem, _context: RenderContext, _settings: Settings): string | null {
        const style = item.displayStyle || 'folder';
        const iconStyle = this.getAvailableStyles().find(s => s.id === style);
        const icon = iconStyle?.label || '📁';
        return ` ${icon} `;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(item: WidgetItem): boolean { return true; }
}