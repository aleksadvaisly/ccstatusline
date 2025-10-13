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
    getDescription(): string { return 'Shows git changes count (+insertions, -deletions, ↑commits ahead, ?untracked, ±files)'; }
    getDisplayName(): string { return 'Git Changes'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'show-nogit', label: '(+42,-10,↑3,?5) / (no git)' },
            { id: 'hide-nogit', label: '(+42,-10,↑3,?5) / (hidden)' }
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
            return '(+42,-10,↑3,?5)';
        }

        const changes = this.getGitChanges();
        if (changes) {
            const parts: string[] = [];
            if (changes.insertions > 0) {
                parts.push(`+${changes.insertions}`);
            }
            if (changes.deletions > 0) {
                parts.push(`-${changes.deletions}`);
            }
            if (changes.commitsAhead > 0) {
                parts.push(`↑${changes.commitsAhead}`);
            }
            if (changes.untracked > 0) {
                parts.push(`?${changes.untracked}`);
            }

            // If no line-based changes but files are modified (binary, deleted, etc.)
            if (parts.length === 0 && changes.modifiedFiles > 0) {
                parts.push(`±${changes.modifiedFiles}`);
            }

            if (parts.length === 0) {
                return null;
            }

            return `(${parts.join(',')})`;
        }
        return hideNoGit ? null : '(no git)';
    }

    private getGitChanges(): { insertions: number; deletions: number; commitsAhead: number; untracked: number; modifiedFiles: number } | null {
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

            let untracked = 0;
            try {
                const untrackedOutput = execSync('git ls-files --others --exclude-standard', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }).trim();
                untracked = untrackedOutput ? untrackedOutput.split('\n').length : 0;
            } catch {
                untracked = 0;
            }

            // Count modified files (staged + unstaged, excluding untracked)
            let modifiedFiles = 0;
            try {
                const statusOutput = execSync('git status --porcelain', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }).trim();
                if (statusOutput) {
                    // Count lines that start with M, A, D, R, C (modified/added/deleted/renamed/copied)
                    // Exclude ?? (untracked) as we count those separately
                    modifiedFiles = statusOutput.split('\n').filter(line => {
                        const status = line.substring(0, 2).trim();
                        return status && status !== '??';
                    }).length;
                }
            } catch {
                modifiedFiles = 0;
            }

            return { insertions: totalInsertions, deletions: totalDeletions, commitsAhead, untracked, modifiedFiles };
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