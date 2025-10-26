import chalk from 'chalk';
import {
    Box,
    Text,
    useInput
} from 'ink';
import React, { useState } from 'react';

export interface ColorPicker256Props {
    initialColor?: number;
    sortMode?: 'numeric' | 'hsl';
    onSelect: (colorCode: number) => void;
    onCancel: () => void;
}

const ANSI_256_COLOR_NAMES: Record<number, string> = {
    0: 'Black',
    1: 'Red',
    2: 'Green',
    3: 'Yellow',
    4: 'Blue',
    5: 'Magenta',
    6: 'Cyan',
    7: 'White',
    8: 'Bright Black',
    9: 'Bright Red',
    10: 'Bright Green',
    11: 'Bright Yellow',
    12: 'Bright Blue',
    13: 'Bright Magenta',
    14: 'Bright Cyan',
    15: 'Bright White'
};

function getColorName(code: number): string {
    if (code >= 0 && code <= 15) {
        return ANSI_256_COLOR_NAMES[code] ?? `System ${code}`;
    } else if (code >= 16 && code <= 231) {
        return `RGB Cube ${code}`;
    } else if (code >= 232 && code <= 255) {
        return `Grayscale ${code}`;
    }
    return `Color ${code}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

        if (max === rNorm) {
            h = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
        } else if (max === gNorm) {
            h = ((bNorm - rNorm) / delta + 2) / 6;
        } else {
            h = ((rNorm - gNorm) / delta + 4) / 6;
        }
    }

    return {
        h: h * 360,
        s: s * 100,
        l: l * 100
    };
}

function ansiToRgb(code: number): { r: number; g: number; b: number } {
    if (code >= 0 && code <= 15) {
        const systemColors: Record<number, [number, number, number]> = {
            0: [0, 0, 0],
            1: [128, 0, 0],
            2: [0, 128, 0],
            3: [128, 128, 0],
            4: [0, 0, 128],
            5: [128, 0, 128],
            6: [0, 128, 128],
            7: [192, 192, 192],
            8: [128, 128, 128],
            9: [255, 0, 0],
            10: [0, 255, 0],
            11: [255, 255, 0],
            12: [0, 0, 255],
            13: [255, 0, 255],
            14: [0, 255, 255],
            15: [255, 255, 255]
        };
        const [r, g, b] = systemColors[code] ?? [0, 0, 0];
        return { r, g, b };
    }

    if (code >= 16 && code <= 231) {
        const index = code - 16;
        const rIndex = Math.floor(index / 36);
        const gIndex = Math.floor((index % 36) / 6);
        const bIndex = index % 6;

        const valueMap = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
        return {
            r: valueMap[rIndex] ?? 0,
            g: valueMap[gIndex] ?? 0,
            b: valueMap[bIndex] ?? 0
        };
    }

    if (code >= 232 && code <= 255) {
        const value = 8 + (code - 232) * 10;
        return { r: value, g: value, b: value };
    }

    return { r: 0, g: 0, b: 0 };
}

function generateGradientOrder(): number[] {
    const colors: { code: number; h: number; s: number; l: number }[] = [];

    for (let code = 0; code < 256; code++) {
        const { r, g, b } = ansiToRgb(code);
        const { h, s, l } = rgbToHsl(r, g, b);
        colors.push({ code, h, s, l });
    }

    const grayscale = colors.filter(c => c.code >= 232 && c.code <= 255);
    const chromatic = colors.filter(c => c.code < 232);

    chromatic.sort((a, b) => {
        if (Math.abs(a.h - b.h) > 5) {
            return a.h - b.h;
        }
        if (Math.abs(a.s - b.s) > 5) {
            return b.s - a.s;
        }
        return Math.abs(a.l - 50) - Math.abs(b.l - 50);
    });

    grayscale.sort((a, b) => a.l - b.l);

    return [...chromatic.map(c => c.code), ...grayscale.map(c => c.code)];
}

function generateNumericOrder(): number[] {
    return Array.from({ length: 256 }, (_, position) => {
        const row = Math.floor(position / 16);
        const col = position % 16;
        return row + col * 16;
    });
}

export const ColorPicker256: React.FC<ColorPicker256Props> = ({ initialColor = 0, sortMode = 'numeric', onSelect, onCancel }) => {
    const [selectedColor, setSelectedColor] = useState(initialColor);

    const colorOrder = sortMode === 'hsl' ? generateGradientOrder() : generateNumericOrder();
    const positionMap = new Map<number, number>();
    colorOrder.forEach((colorCode, position) => {
        positionMap.set(colorCode, position);
    });

    const selectedPosition = positionMap.get(selectedColor) ?? 0;
    const column = selectedPosition % 16;
    const row = Math.floor(selectedPosition / 16);

    useInput((input, key) => {
        if (key.escape) {
            onCancel();
        } else if (key.return) {
            onSelect(selectedColor);
        } else if (key.leftArrow) {
            const newColumn = column === 0 ? 15 : column - 1;
            const newPosition = row * 16 + newColumn;
            setSelectedColor(colorOrder[newPosition] ?? 0);
        } else if (key.rightArrow) {
            const newColumn = column === 15 ? 0 : column + 1;
            const newPosition = row * 16 + newColumn;
            setSelectedColor(colorOrder[newPosition] ?? 0);
        } else if (key.upArrow) {
            const newRow = row === 0 ? 15 : row - 1;
            const newPosition = newRow * 16 + column;
            setSelectedColor(colorOrder[newPosition] ?? 0);
        } else if (key.downArrow) {
            const newRow = row === 15 ? 0 : row + 1;
            const newPosition = newRow * 16 + column;
            setSelectedColor(colorOrder[newPosition] ?? 0);
        }
    });

    const grid: React.JSX.Element[] = [];
    for (let r = 0; r < 16; r++) {
        const rowElements: React.JSX.Element[] = [];
        for (let c = 0; c < 16; c++) {
            const position = r * 16 + c;
            const colorCode = colorOrder[position] ?? 0;
            const isSelected = colorCode === selectedColor;
            const colorBlock = chalk.ansi256(colorCode)('█');

            if (isSelected) {
                rowElements.push(
                    <Text key={position} bold color='yellow'>
                        [
                        {colorBlock}
                        ]
                    </Text>
                );
            } else {
                rowElements.push(
                    <Text key={position}>
                        {' '}
                        {colorBlock}
                        {' '}
                    </Text>
                );
            }
        }
        grid.push(
            <Box key={r}>
                {rowElements}
            </Box>
        );
    }

    const colorName = getColorName(selectedColor);
    const previewBlock = chalk.ansi256(selectedColor)('███████████');
    const title = sortMode === 'hsl' ? 'ANSI 256 Color Picker (HSL Sorted)' : 'ANSI 256 Color Picker';

    return (
        <Box flexDirection='column'>
            <Text bold>{title}</Text>
            <Box marginTop={1} flexDirection='column'>
                {grid}
            </Box>
            <Box marginTop={1} flexDirection='column'>
                <Text>
                    Selected:
                    {' '}
                    {selectedColor}
                    {' '}
                    (
                    {colorName}
                    )
                </Text>
                <Text>
                    Preview:
                    {' '}
                    {previewBlock}
                </Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>← ↑ ↓ → Navigate | Enter Select | ESC Cancel</Text>
            </Box>
        </Box>
    );
};