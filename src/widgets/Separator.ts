import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetCategory,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class SeparatorWidget implements Widget {
    getDefaultColor(): string { return 'gray'; }
    getDescription(): string { return 'Visual separator between widgets'; }
    getDisplayName(): string { return 'Separator'; }
    getCategory(): WidgetCategory { return 'separator'; }
    canInheritColors(): boolean { return true; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'pipe', label: ' | ' },
            { id: 'dash', label: ' - ' },
            { id: 'comma', label: ', ' },
            { id: 'dot', label: ' · ' },
            { id: 'single', label: ' ' },
            { id: 'double', label: '  ' },
            { id: 'triple', label: '   ' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const styles = this.getAvailableStyles();
        let currentStyle = item.displayStyle ?? 'pipe';

        // Backward compatibility for old style names
        if (currentStyle === 'space') {
            currentStyle = 'double';
        } else if (currentStyle === 'double-space') {
            currentStyle = 'triple';
        }

        const styleObj = styles.find(s => s.id === currentStyle);
        const display = styleObj ? styleObj.label : ' | ';

        return {
            displayText: this.getDisplayName(),
            modifierText: `'${display}'`
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const styles = this.getAvailableStyles();
        let currentStyle = item.displayStyle ?? (item.character ? this.mapCharacterToStyle(item.character) : 'pipe');

        // Backward compatibility for old style names
        if (currentStyle === 'space') {
            currentStyle = 'double';
        } else if (currentStyle === 'double-space') {
            currentStyle = 'triple';
        }

        const styleObj = styles.find(s => s.id === currentStyle);

        return styleObj ? styleObj.label : ' | ';
    }

    private mapCharacterToStyle(char: string): string {
        switch (char) {
        case '|': return 'pipe';
        case '-': return 'dash';
        case ',': return 'comma';
        case '·': return 'dot';
        case ' ': return 'single';
        case '  ': return 'double';
        case '   ': return 'triple';
        default: return 'pipe';
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(item: WidgetItem): boolean { return true; }
}