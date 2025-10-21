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
    getDescription(): string { return 'Shows git changes as detailed count or simple indicator (*x staged, +x insertions, -x deletions, ↑x unpushed, ?x untracked)'; }
    getDisplayName(): string { return 'Git Changes'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'detailed-show', label: '(*2,+42,-10,↑3,?5) / (no git)' },
            { id: 'detailed-hide', label: '(*2,+42,-10,↑3,?5) / (hidden)' },
            { id: 'indicator-show', label: '* or ↑ / (no git)' },
            { id: 'indicator-hide', label: '* or ↑ / (hidden)' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        // Determine style (with backward compatibility)
        let style = item.displayStyle;
        if (!style) {
            const hideNoGit = item.metadata?.hideNoGit === 'true';
            style = hideNoGit ? 'detailed-hide' : 'detailed-show';
        }

        // Backward compatibility: old style names
        if (style === 'show-nogit') {
            style = 'detailed-show';
        } else if (style === 'hide-nogit') {
            style = 'detailed-hide';
        }

        const isIndicator = style.startsWith('indicator');
        const hideNoGit = style.includes('hide');

        if (context.isPreview) {
            return isIndicator ? '*' : '(*2,+42,-10,↑3,?5)';
        }

        const changes = this.getGitChanges();
        if (changes) {
            if (isIndicator) {
                // Indicator mode: * for changes, ↑ for commits ahead, null for clean
                const hasChanges = changes.modifiedFiles > 0 || changes.untracked > 0;
                if (hasChanges) {
                    return '*';
                } else if (changes.commitsAhead > 0) {
                    return '↑';
                } else {
                    return null;
                }
            } else {
                // Detailed mode: (*x,+x,-x,↑x,?x,±x)
                const parts: string[] = [];
                if (changes.stagedFiles > 0) {
                    parts.push(`*${changes.stagedFiles}`);
                }
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
        }
        return hideNoGit ? null : (isIndicator ? '(no git)' : '(no git)');
    }

    private getGitChanges(): { insertions: number; deletions: number; commitsAhead: number; untracked: number; modifiedFiles: number; stagedFiles: number } | null {
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
            let stagedFiles = 0;
            try {
                const statusOutput = execSync('git status --porcelain', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }).trim();
                if (statusOutput) {
                    // Count lines that start with M, A, D, R, C (modified/added/deleted/renamed/copied)
                    // Exclude ?? (untracked) as we count those separately
                    modifiedFiles = statusOutput.split('\n').filter((line) => {
                        const status = line.substring(0, 2).trim();
                        return status && status !== '??';
                    }).length;

                    // Count staged files (first column not space or ?)
                    stagedFiles = statusOutput.split('\n').filter((line) => {
                        const firstChar = line[0];
                        return firstChar && firstChar !== ' ' && firstChar !== '?';
                    }).length;
                }
            } catch {
                modifiedFiles = 0;
                stagedFiles = 0;
            }

            return { insertions: totalInsertions, deletions: totalDeletions, commitsAhead, untracked, modifiedFiles, stagedFiles };
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