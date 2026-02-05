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

export class GitBranchWidget implements Widget {
    getDefaultColor(): string { return 'magenta'; }
    getDescription(): string { return 'Shows the current git branch name with ✗ for gone upstream, * for changes, and ↑ for unpushed commits'; }
    getDisplayName(): string { return 'Git Branch'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'icon-only', label: '⎇ main / n/a' },
            { id: 'icon-with-indicator', label: '⎇ main * / n/a' },
            { id: 'plain-only', label: 'main / n/a' },
            { id: 'plain-with-indicator', label: 'main * / n/a' }
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
            const isRaw = item.rawValue;
            if (hideNoGit) {
                style = isRaw ? 'plain-with-indicator' : 'icon-with-indicator';
            } else {
                style = isRaw ? 'plain-only' : 'icon-only';
            }
        }

        // Backward compatibility: old style names (all old styles had indicators)
        if (style === 'with-icon-show' || style === 'with-icon-hide') {
            style = 'icon-with-indicator';
        } else if (style === 'plain-show' || style === 'plain-hide') {
            style = 'plain-with-indicator';
        }

        const withIcon = style.startsWith('icon');
        const withIndicator = style.includes('indicator');

        if (context.isPreview) {
            if (withIcon && withIndicator) {
                return '⎇ main *';
            } else if (withIcon) {
                return '⎇ main';
            } else if (withIndicator) {
                return 'main *';
            } else {
                return 'main';
            }
        }

        const cwd = context.cwd;
        const branch = this.getGitBranch(cwd);
        if (branch) {
            let indicator = '';
            if (withIndicator) {
                const upstreamGone = this.isUpstreamGone(cwd);
                const hasChanges = this.hasGitChanges(cwd);
                const commitsAhead = this.getCommitsAhead(cwd);

                if (upstreamGone) {
                    indicator = ' ✗';
                } else if (hasChanges) {
                    indicator = ' *';
                } else if (commitsAhead > 0) {
                    indicator = ' ↑';
                }
            }

            return withIcon ? `⎇ ${branch}${indicator}` : `${branch}${indicator}`;
        }

        return 'n/a';
    }

    private getGitBranch(cwd?: string): string | null {
        try {
            const branch = execSync('git branch --show-current', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                cwd
            }).trim();

            if (branch) {
                return branch;
            }

            try {
                const hash = execSync('git rev-parse --short HEAD', {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore'],
                    cwd
                }).trim();
                return hash ? hash : null;
            } catch {
                return null;
            }
        } catch {
            return null;
        }
    }

    private hasGitChanges(cwd?: string): boolean {
        try {
            const status = execSync('git status --porcelain', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                cwd
            }).trim();
            return status.length > 0;
        } catch {
            return false;
        }
    }

    private getCommitsAhead(cwd?: string): number {
        try {
            const count = execSync('git rev-list --count @{u}..HEAD', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                cwd
            }).trim();
            return parseInt(count, 10) || 0;
        } catch {
            return 0;
        }
    }

    private isUpstreamGone(cwd?: string): boolean {
        try {
            execSync('git rev-parse --abbrev-ref @{u}', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                cwd
            });
            return false;
        } catch {
            return true;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}