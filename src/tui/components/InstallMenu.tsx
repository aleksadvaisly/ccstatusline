import { execSync } from 'child_process';
import {
    Box,
    Text,
    useInput
} from 'ink';
import React, { useState } from 'react';

import { getClaudeSettingsPath } from '../../utils/claude-settings';

export interface InstallMenuProps {
    bunxAvailable: boolean;
    existingStatusLine: string | null;
    onSelectNpx: () => void;
    onSelectBunx: () => void;
    onSelectCustom: () => void;
    onUninstall: () => void;
    onCancel: () => void;
}

export const InstallMenu: React.FC<InstallMenuProps> = ({
    bunxAvailable,
    existingStatusLine,
    onSelectNpx,
    onSelectBunx,
    onSelectCustom,
    onUninstall,
    onCancel
}) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildError, setBuildError] = useState<string | null>(null);

    const buildProject = (): boolean => {
        setIsBuilding(true);
        setBuildError(null);

        try {
            execSync('npm run build', {
                cwd: process.cwd(),
                stdio: 'pipe',
                encoding: 'utf8'
            });
            setIsBuilding(false);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Build failed with unknown error';
            setBuildError(errorMessage);
            setIsBuilding(false);
            return false;
        }
    };

    const handleSelectCustom = () => {
        const buildSuccess = buildProject();
        if (buildSuccess) {
            onSelectCustom();
        }
    };

    const menuItems = [
        { label: 'npx - Node Package Execute', action: onSelectNpx, enabled: true, selectable: true },
        { label: 'bunx - Bun Package Execute', action: onSelectBunx, enabled: bunxAvailable, selectable: true },
        { label: 'Custom Path (for developers)', action: handleSelectCustom, enabled: true, selectable: true },
        { label: '', action: () => {}, enabled: true, selectable: false },  // Visual gap
        { label: '🗑️  Uninstall ccstatusline', action: onUninstall, enabled: true, selectable: true },
        { label: '', action: () => {}, enabled: true, selectable: false },  // Visual gap
        { label: '← Back', action: onCancel, enabled: true, selectable: true }
    ];
    const enabledItems = menuItems.filter(item => item.enabled && item.selectable);

    useInput((input, key) => {
        if (isBuilding) {
            return;
        }

        if (buildError) {
            if (key.escape) {
                setBuildError(null);
            } else if (input === 'r' || input === 'R') {
                handleSelectCustom();
            } else if (input === 's' || input === 'S') {
                setBuildError(null);
                onSelectCustom();
            }
            return;
        }

        if (key.escape) {
            onCancel();
        } else if (key.upArrow) {
            setSelectedIndex(Math.max(0, selectedIndex - 1));
        } else if (key.downArrow) {
            setSelectedIndex(Math.min(enabledItems.length - 1, selectedIndex + 1));
        } else if (key.return) {
            enabledItems[selectedIndex]?.action();
        }
    });

    if (isBuilding) {
        return (
            <Box flexDirection='column'>
                <Text bold>Building project...</Text>
                <Box marginTop={1}>
                    <Text color='blue'>Running npm run build, please wait...</Text>
                </Box>
            </Box>
        );
    }

    if (buildError) {
        return (
            <Box flexDirection='column'>
                <Text bold color='red'>Build Failed</Text>
                <Box marginTop={1}>
                    <Text color='red'>{buildError}</Text>
                </Box>
                <Box marginTop={2} flexDirection='column'>
                    <Text>(r) Retry build</Text>
                    <Text>(s) Skip build and continue anyway</Text>
                    <Text dimColor>ESC to cancel</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection='column'>
            <Text bold>Install ccstatusline to Claude Code</Text>

            {existingStatusLine && (
                <Box marginBottom={1}>
                    <Text color='yellow'>
                        ⚠ Current status line: "
                        {existingStatusLine}
                        "
                    </Text>
                </Box>
            )}

            <Box>
                <Text dimColor>Select installation method:</Text>
            </Box>

            <Box marginTop={1} flexDirection='column'>
                {menuItems.filter(item => item.enabled).map((item, idx) => {
                    if (!item.selectable && item.label === '') {
                        return <Text key={`gap-${idx}`}> </Text>;
                    }
                    const selectableIdx = enabledItems.indexOf(item);
                    const isSelected = selectableIdx === selectedIndex;
                    return (
                        <Box key={item.label || `gap-${idx}`}>
                            <Text color={isSelected ? 'blue' : undefined}>
                                {isSelected ? '▶  ' : '   '}
                                {item.label}
                            </Text>
                        </Box>
                    );
                })}
            </Box>

            <Box marginTop={2}>
                <Text dimColor>
                    The selected command will be written to
                    {' '}
                    {getClaudeSettingsPath()}
                </Text>
            </Box>

            <Box marginTop={1}>
                <Text dimColor>Press Enter to select, ESC to cancel</Text>
            </Box>
        </Box>
    );
};