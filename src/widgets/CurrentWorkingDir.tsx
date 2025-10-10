import {
    Box,
    Text,
    useInput
} from 'ink';
import * as os from 'node:os';
import React, { useState } from 'react';

import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetEditorProps,
    WidgetItem
} from '../types/Widget';

export class CurrentWorkingDirWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows the current working directory'; }
    getDisplayName(): string { return 'Current Working Dir'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'labeled', label: 'Folder: /path' },
            { id: 'plain', label: '/path' },
            { id: 'basename', label: 'folder-name' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const segments = item.metadata?.segments ? parseInt(item.metadata.segments, 10) : undefined;
        const fishStyle = item.metadata?.fishStyle === 'true';
        const modifiers: string[] = [];

        // Show display style
        const styles = this.getAvailableStyles();
        const currentStyle = item.displayStyle ?? (item.rawValue ? 'plain' : 'labeled');
        const style = styles.find(s => s.id === currentStyle);
        if (style) {
            modifiers.push(style.label);
        }

        // Show legacy modifiers if present
        if (fishStyle) {
            modifiers.push('fish-style');
        } else if (segments && segments > 0) {
            modifiers.push(`segments: ${segments}`);
        }

        return {
            displayText: this.getDisplayName(),
            modifierText: modifiers.length > 0 ? `(${modifiers.join(', ')})` : undefined
        };
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        if (action === 'toggle-fish-style') {
            const currentFishStyle = item.metadata?.fishStyle === 'true';
            const newFishStyle = !currentFishStyle;

            // Toggle fish style and clear segments
            if (newFishStyle) {
                // When enabling fish-style, clear segments
                const { segments, ...restMetadata } = item.metadata ?? {};
                void segments;
                return {
                    ...item,
                    metadata: {
                        ...restMetadata,
                        fishStyle: 'true'
                    }
                };
            } else {
                // When disabling fish-style
                const { fishStyle, ...restMetadata } = item.metadata ?? {};
                void fishStyle;

                return {
                    ...item,
                    metadata: Object.keys(restMetadata).length > 0 ? restMetadata : undefined
                };
            }
        }

        return null;
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const segments = item.metadata?.segments ? parseInt(item.metadata.segments, 10) : undefined;
        const fishStyle = item.metadata?.fishStyle === 'true';

        const cwd = context.isPreview ? '/Users/example/Documents/Projects/my-project' : context.data?.cwd;
        if (!cwd)
            return null;

        // Determine display style (support legacy rawValue)
        const displayStyle = item.displayStyle ?? (item.rawValue ? 'plain' : 'labeled');

        // Calculate path based on legacy options or display style
        let displayPath = cwd;

        // Apply legacy transformations if present (takes priority)
        if (fishStyle) {
            displayPath = this.abbreviatePath(cwd);
        } else if (segments && segments > 0) {
            const useBackslash = cwd.includes('\\') && !cwd.includes('/');
            const outSep = useBackslash ? '\\' : '/';
            const pathParts = cwd.split(/[\\/]+/);
            const filteredParts = pathParts.filter(part => part !== '');

            if (filteredParts.length > segments) {
                const selectedSegments = filteredParts.slice(-segments);
                displayPath = '...' + outSep + selectedSegments.join(outSep);
            }
        } else if (displayStyle === 'basename') {
            // Extract basename
            const pathParts = cwd.split(/[\\/]+/);
            const filteredParts = pathParts.filter(part => part !== '');
            displayPath = filteredParts[filteredParts.length - 1] ?? cwd;
        }

        // Apply display style formatting
        switch (displayStyle) {
        case 'plain':
        case 'basename':
            return displayPath;
        case 'labeled':
        default:
            return `Folder: ${displayPath}`;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 's', label: '(s)egments', action: 'edit-segments' },
            { key: 'f', label: '(f)ish style', action: 'toggle-fish-style' }
        ];
    }

    renderEditor(props: WidgetEditorProps): React.ReactElement {
        return <CurrentWorkingDirEditor {...props} />;
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }

    private abbreviatePath(path: string): string {
        const homeDir = os.homedir();
        const useBackslash = path.includes('\\') && !path.includes('/');
        const sep = useBackslash ? '\\' : '/';

        // Replace home directory with ~
        let normalizedPath = path;
        if (path.startsWith(homeDir)) {
            normalizedPath = '~' + path.slice(homeDir.length);
        }

        // Split path into parts
        const parts = normalizedPath.split(/[\\/]+/).filter(part => part !== '');

        // Keep first and last parts full, abbreviate middle parts
        const abbreviated = parts.map((part, index) => {
            if (index === 0 || index === parts.length - 1) {
                return part;  // Keep full
            }

            // Hidden directories keep the dot
            if (part.startsWith('.') && part.length > 1) {
                return '.' + (part[1] ?? '');
            }

            return part[0];  // Only first letter for others
        });

        // Rebuild path
        if (normalizedPath.startsWith('~')) {
            return abbreviated.join(sep);
        } else if (normalizedPath.startsWith('/')) {
            return sep + abbreviated.join(sep);
        } else {
            return abbreviated.join(sep);
        }
    }
}

const CurrentWorkingDirEditor: React.FC<WidgetEditorProps> = ({ widget, onComplete, onCancel, action }) => {
    const [segmentsInput, setSegmentsInput] = useState(widget.metadata?.segments ?? '');

    useInput((input, key) => {
        if (action === 'edit-segments') {
            if (key.return) {
                const segments = parseInt(segmentsInput, 10);
                if (!isNaN(segments) && segments > 0) {
                    onComplete({
                        ...widget,
                        metadata: {
                            ...widget.metadata,
                            segments: segments.toString()
                        }
                    });
                } else {
                    // Clear segments if blank or invalid
                    const { segments, ...restMetadata } = widget.metadata ?? {};
                    void segments; // Intentionally unused
                    onComplete({
                        ...widget,
                        metadata: Object.keys(restMetadata).length > 0 ? restMetadata : undefined
                    });
                }
            } else if (key.escape) {
                onCancel();
            } else if (key.backspace) {
                setSegmentsInput(segmentsInput.slice(0, -1));
            } else if (input && /\d/.test(input) && !key.ctrl) {
                setSegmentsInput(segmentsInput + input);
            }
        }
    });

    if (action === 'edit-segments') {
        return (
            <Box flexDirection='column'>
                <Box>
                    <Text>Enter number of segments to display (blank for full path): </Text>
                    <Text>{segmentsInput}</Text>
                    <Text backgroundColor='gray' color='black'>{' '}</Text>
                </Box>
                <Text dimColor>Press Enter to save, ESC to cancel</Text>
            </Box>
        );
    }

    return <Text>Unknown editor mode</Text>;
};