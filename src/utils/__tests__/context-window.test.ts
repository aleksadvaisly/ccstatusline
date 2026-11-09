import {
    describe,
    expect,
    it
} from 'vitest';

import { getContextWindow } from '../renderer';

describe('getContextWindow', () => {
    it('uses the window size reported by Claude Code', () => {
        expect(getContextWindow({
            model: { id: 'claude-opus-5-5' },
            context_window: { context_window_size: 1000000 }
        })).toBe(1000000);
    });

    it('prefers the reported size over the model id suffix', () => {
        expect(getContextWindow({
            model: { id: 'claude-sonnet-4-5[1m]' },
            context_window: { context_window_size: 200000 }
        })).toBe(200000);
    });

    it('falls back to the model id suffix when no size is reported', () => {
        expect(getContextWindow({ model: { id: 'claude-sonnet-4-5[1m]' } })).toBe(1000000);
        expect(getContextWindow({ model: { id: 'claude-sonnet-4-5[500k]' } })).toBe(500000);
    });

    it('ignores a null or non-positive reported size', () => {
        expect(getContextWindow({
            model: { id: 'claude-sonnet-4-5[1m]' },
            context_window: { context_window_size: null }
        })).toBe(1000000);
        expect(getContextWindow({ context_window: { context_window_size: 0 } })).toBe(200000);
    });

    it('defaults to 200k without any hint', () => {
        expect(getContextWindow()).toBe(200000);
        expect(getContextWindow({ model: { id: 'claude-opus-5-5' } })).toBe(200000);
    });
});