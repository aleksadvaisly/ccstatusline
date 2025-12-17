import type { Settings } from '../types/Settings';
import type {
    Widget,
    WidgetCategory,
    WidgetItem,
    WidgetItemType
} from '../types/Widget';
import * as widgets from '../widgets';

// Create widget registry
const widgetRegistry = new Map<WidgetItemType, Widget>([
    ['model', new widgets.ModelWidget()],
    ['output-style', new widgets.OutputStyleWidget()],
    ['git-branch', new widgets.GitBranchWidget()],
    ['git-changes', new widgets.GitChangesWidget()],
    ['git-worktree', new widgets.GitWorktreeWidget()],
    ['git-user', new widgets.GitUserWidget()],
    ['current-working-dir', new widgets.CurrentWorkingDirWidget()],
    ['tokens-input', new widgets.TokensInputWidget()],
    ['tokens-output', new widgets.TokensOutputWidget()],
    ['tokens-cached', new widgets.TokensCachedWidget()],
    ['tokens-total', new widgets.TokensTotalWidget()],
    ['context-length', new widgets.ContextLengthWidget()],
    ['context-percentage', new widgets.ContextPercentageWidget()],
    ['context-percentage-usable', new widgets.ContextPercentageUsableWidget()],
    ['session-clock', new widgets.SessionClockWidget()],
    ['session-cost', new widgets.SessionCostWidget()],
    ['block-timer', new widgets.BlockTimerWidget()],
    ['terminal-width', new widgets.TerminalWidthWidget()],
    ['version', new widgets.VersionWidget()],
    ['custom-text', new widgets.CustomTextWidget()],
    ['custom-command', new widgets.CustomCommandWidget()],
    ['separator', new widgets.SeparatorWidget()],
    ['flex-separator', new widgets.FlexSeparatorWidget()],
    ['icon', new widgets.IconWidget()]
]);

export function getWidget(type: WidgetItemType): Widget | null {
    return widgetRegistry.get(type) ?? null;
}

export function getAllWidgetTypes(settings: Settings): WidgetItemType[] {
    const allTypes = Array.from(widgetRegistry.keys());

    // Filter out separator types if powerline is enabled
    if (settings.powerline.enabled) {
        return allTypes.filter((type) => {
            const widget = widgetRegistry.get(type);
            const category = widget?.getCategory?.() ?? 'content';
            return category !== 'separator' && category !== 'dynamic';
        });
    }

    // Filter out manual separator if default separator is enabled
    if (settings.defaultSeparator) {
        return allTypes.filter(type => type !== 'separator');
    }

    return allTypes;
}

export function isKnownWidgetType(type: string): boolean {
    return widgetRegistry.has(type);
}

// Helper function to get widget category
export function getWidgetCategory(widget: WidgetItem): WidgetCategory {
    const widgetImpl = getWidget(widget.type);
    return widgetImpl?.getCategory?.() ?? 'content';
}

// Helper function to check if widget is a separator
export function isSeparator(widget: WidgetItem): boolean {
    return getWidgetCategory(widget) === 'separator';
}

// Helper function to check if widget is flex separator
export function isFlexSeparator(widget: WidgetItem): boolean {
    return getWidgetCategory(widget) === 'dynamic';
}