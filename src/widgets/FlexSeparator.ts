import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetCategory,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class FlexSeparatorWidget implements Widget {
    getDefaultColor(): string { return 'gray'; }
    getDescription(): string { return 'Flexible separator that expands to fill available space'; }
    getDisplayName(): string { return 'Flex Separator'; }
    getCategory(): WidgetCategory { return 'dynamic'; }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return {
            displayText: this.getDisplayName(),
            modifierText: '(expands to fill space)'
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Flex separator returns a marker that will be replaced during rendering
        return 'FLEX';
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(item: WidgetItem): boolean { return false; }
}