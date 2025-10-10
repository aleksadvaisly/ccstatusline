import { execSync } from 'child_process';

import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class GitChangesWidget implements Widget {
    getDefaultColor(): string { return 'yellow'; }
    getDescription(): string { return 'Shows git changes count (+insertions, -deletions, ↑commits ahead)'; }
    getDisplayName(): string { return 'Git Changes'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'show-nogit', label: '(+42,-10,↑3) / (no git)' },
            { id: 'hide-nogit', label: '(+42,-10,↑3) / (hidden)' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return {
            displayText: this.getDisplayName()
        };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Determine style (with backward compatibility)
        let style = item.displayStyle;
        if (!style) {
            const hideNoGit = item.metadata?.hideNoGit === 'true';
            style = hideNoGit ? 'hide-nogit' : 'show-nogit';
        }

        const hideNoGit = style === 'hide-nogit';

        if (context.isPreview) {
            return '(+42,-10,↑3)';
        }

        const changes = this.getGitChanges();
        if (changes) {
            const aheadInfo = changes.commitsAhead > 0 ? `,↑${changes.commitsAhead}` : '';
            return `(+${changes.insertions},-${changes.deletions}${aheadInfo})`;
        }
        return hideNoGit ? null : '(no git)';
    }

    private getGitChanges(): { insertions: number; deletions: number; commitsAhead: number } | null {
        try {
            let totalInsertions = 0;
            let totalDeletions = 0;

            const unstagedStat = execSync('git diff --shortstat', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();

            const stagedStat = execSync('git diff --cached --shortstat', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();

            if (unstagedStat) {
                const insertMatch = /(\d+) insertion/.exec(unstagedStat);
                const deleteMatch = /(\d+) deletion/.exec(unstagedStat);
                totalInsertions += insertMatch?.[1] ? parseInt(insertMatch[1], 10) : 0;
                totalDeletions += deleteMatch?.[1] ? parseInt(deleteMatch[1], 10) : 0;
            }

            if (stagedStat) {
                const insertMatch = /(\d+) insertion/.exec(stagedStat);
                const deleteMatch = /(\d+) deletion/.exec(stagedStat);
                totalInsertions += insertMatch?.[1] ? parseInt(insertMatch[1], 10) : 0;
                totalDeletions += deleteMatch?.[1] ? parseInt(deleteMatch[1], 10) : 0;
            }

            let commitsAhead = 0;
            try {
                const aheadOutput = execSync('git rev-list --count @{u}..HEAD', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }).trim();
                commitsAhead = parseInt(aheadOutput, 10) || 0;
            } catch {
                commitsAhead = 0;
            }

            return { insertions: totalInsertions, deletions: totalDeletions, commitsAhead };
        } catch {
            return null;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return false; }
    supportsColors(item: WidgetItem): boolean { return true; }
}