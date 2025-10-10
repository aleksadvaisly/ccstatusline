import {
    Box,
    Text,
    useInput
} from 'ink';
import React, { useState } from 'react';

import { getClaudeSettingsPath } from '../../utils/claude-settings';

export interface CustomPathInputProps {
    existingStatusLine: string | null;
    onSubmit: (path: string) => void;
    onCancel: () => void;
}

export const CustomPathInput: React.FC<CustomPathInputProps> = ({
    existingStatusLine,
    onSubmit,
    onCancel
}) => {
    const defaultPath = `${process.cwd()}/dist/ccstatusline.js`;
    const [path, setPath] = useState(defaultPath);

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        } else if (key.return) {
            if (path.trim()) {
                onSubmit(path.trim());
            }
        } else if (key.backspace || key.delete) {
            setPath(path.slice(0, -1));
        } else if (!key.ctrl && !key.meta && input) {
            setPath(path + input);
        }
    });

    return (
        <Box flexDirection='column'>
            <Text bold>Install ccstatusline with Custom Path</Text>

            {existingStatusLine && (
                <Box marginTop={1} marginBottom={1}>
                    <Text color='yellow'>
                        ⚠ Current status line: "
                        {existingStatusLine}
                        "
                    </Text>
                </Box>
            )}

            <Box marginTop={1}>
                <Text>Enter absolute path to ccstatusline.js:</Text>
            </Box>

            <Box marginTop={1}>
                <Text color='cyan'>
                    node
                    {' '}
                    {path}
                    <Text inverse> </Text>
                </Text>
            </Box>

            <Box marginTop={2}>
                <Text dimColor>
                    Current project:
                    {' '}
                    {process.cwd()}
                </Text>
            </Box>

            <Box marginTop={1}>
                <Text dimColor>
                    The command will be written to
                    {' '}
                    {getClaudeSettingsPath()}
                </Text>
            </Box>

            <Box marginTop={2}>
                <Text dimColor>Press Enter to install, ESC to cancel</Text>
            </Box>
        </Box>
    );
};