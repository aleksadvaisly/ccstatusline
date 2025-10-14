import {
    Box,
    Text,
    useInput
} from 'ink';
import React, { useState } from 'react';

export interface ExitDialogProps {
    onSaveOnly: () => void;
    onSaveAndReinstall: () => void;
    onCancelEditing: () => void;
    onBackToMain: () => void;
}

export const ExitDialog: React.FC<ExitDialogProps> = ({
    onSaveOnly,
    onSaveAndReinstall,
    onCancelEditing,
    onBackToMain
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const menuItems = [
        { label: '💾 Save only', action: onSaveOnly },
        { label: '🔄 Save & (re)install', action: onSaveAndReinstall },
        { label: '❌ Cancel editing (discard changes)', action: onCancelEditing }
    ];

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex(Math.max(0, selectedIndex - 1));
        } else if (key.downArrow) {
            setSelectedIndex(Math.min(menuItems.length - 1, selectedIndex + 1));
        } else if (key.return) {
            menuItems[selectedIndex]?.action();
        } else if (key.escape) {
            // ESC cancels the exit dialog and returns to main menu
            onBackToMain();
        }
    });

    return (
        <Box flexDirection='column'>
            <Text bold>Unsaved Changes</Text>
            <Box marginTop={1}>
                <Text>You have unsaved changes. What would you like to do?</Text>
            </Box>
            <Box marginTop={1} flexDirection='column'>
                {menuItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                        <Text
                            key={idx}
                            color={isSelected ? 'green' : undefined}
                        >
                            {isSelected ? '▶  ' : '   '}
                            {item.label}
                        </Text>
                    );
                })}
            </Box>
            <Box marginTop={2}>
                <Text dimColor>Press ESC to return to editing</Text>
            </Box>
        </Box>
    );
};