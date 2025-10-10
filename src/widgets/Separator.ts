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
            { id: 'space', label: '  ' },
            { id: 'double-space', label: '   ' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const styles = this.getAvailableStyles();
        const currentStyle = item.displayStyle ?? 'pipe';
        const styleObj = styles.find(s => s.id === currentStyle);
        const display = styleObj ? styleObj.label : ' | ';

        return {
            displayText: this.getDisplayName(),
            modifierText: `'${display}'`
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const styles = this.getAvailableStyles();
        const currentStyle = item.displayStyle ?? (item.character ? this.mapCharacterToStyle(item.character) : 'pipe');
        const styleObj = styles.find(s => s.id === currentStyle);

        return styleObj ? styleObj.label : ' | ';
    }

    private mapCharacterToStyle(char: string): string {
        switch (char) {
        case '|': return 'pipe';
        case '-': return 'dash';
        case ',': return 'comma';
        case '·': return 'dot';
        case ' ': return 'space';
        case '  ': return 'double-space';
        default: return 'pipe';
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(item: WidgetItem): boolean { return true; }
}