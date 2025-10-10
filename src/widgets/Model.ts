import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class ModelWidget implements Widget {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Displays the Claude model name (e.g., Sonnet 4.5)'; }
    getDisplayName(): string { return 'Model'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const styles = this.getAvailableStyles();
        const currentStyle = item.displayStyle ?? (item.rawValue ? 'plain' : 'labeled');
        const style = styles.find(s => s.id === currentStyle);

        return {
            displayText: this.getDisplayName(),
            modifierText: style ? `(${style.label})` : undefined
        };
    }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'labeled', label: 'Model: Sonnet 4.5' },
            { id: 'plain', label: 'Sonnet 4.5' },
            { id: 'bracketed', label: '[Sonnet 4.5]' }
        ];
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const modelName = context.isPreview ? 'Sonnet 4.5' : context.data?.model?.display_name;
        if (!modelName)
            return null;

        // Support legacy rawValue
        const style = item.displayStyle ?? (item.rawValue ? 'plain' : 'labeled');

        switch (style) {
        case 'plain':
            return modelName;
        case 'bracketed':
            return `[${modelName}]`;
        case 'labeled':
        default:
            return `Model: ${modelName}`;
        }
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}