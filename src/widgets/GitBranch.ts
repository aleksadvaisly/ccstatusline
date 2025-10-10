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
    getDescription(): string { return 'Shows the current git branch name with * for changes and ↑ for unpushed commits'; }
    getDisplayName(): string { return 'Git Branch'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'with-icon-show', label: '⎇ main / ⎇ no git' },
            { id: 'with-icon-hide', label: '⎇ main / (hidden)' },
            { id: 'plain-show', label: 'main / no git' },
            { id: 'plain-hide', label: 'main / (hidden)' }
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
            const isRaw = item.rawValue;
            if (hideNoGit) {
                style = isRaw ? 'plain-hide' : 'with-icon-hide';
            } else {
                style = isRaw ? 'plain-show' : 'with-icon-show';
            }
        }

        const withIcon = style.startsWith('with-icon');
        const hideNoGit = style.includes('hide');

        if (context.isPreview) {
            return withIcon ? '⎇ main *' : 'main *';
        }

        const branch = this.getGitBranch();
        if (branch) {
            const hasChanges = this.hasGitChanges();
            const commitsAhead = this.getCommitsAhead();

            let indicator = '';
            if (hasChanges) {
                indicator = ' *';
            } else if (commitsAhead > 0) {
                indicator = ' ↑';
            }

            return withIcon ? `⎇ ${branch}${indicator}` : `${branch}${indicator}`;
        }

        if (hideNoGit) {
            return null;
        }
        return withIcon ? '⎇ no git' : 'no git';
    }

    private getGitBranch(): string | null {
        try {
            const branch = execSync('git branch --show-current', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            return branch || null;
        } catch {
            return null;
        }
    }

    private hasGitChanges(): boolean {
        try {
            const status = execSync('git status --porcelain', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            return status.length > 0;
        } catch {
            return false;
        }
    }

    private getCommitsAhead(): number {
        try {
            const count = execSync('git rev-list --count @{u}..HEAD', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            return parseInt(count, 10) || 0;
        } catch {
            return 0;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}