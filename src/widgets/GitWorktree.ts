import { execSync } from 'child_process';

import type { RenderContext } from '../types/RenderContext';
import type {
    CustomKeybind,
    DisplayStyle,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';

export class GitWorktreeWidget implements Widget {
    getDefaultColor(): string { return 'blue'; }
    getDescription(): string { return 'Shows the current git worktree name'; }
    getDisplayName(): string { return 'Git Worktree'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'with-icon-show', label: '𖠰 main / 𖠰 no git' },
            { id: 'with-icon-hide', label: '𖠰 main / (hidden)' },
            { id: 'plain-show', label: 'main / no git' },
            { id: 'plain-hide', label: 'main / (hidden)' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext): string | null {
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
            return withIcon ? '𖠰 main' : 'main';
        }

        const worktree = this.getGitWorktree();
        if (worktree) {
            return withIcon ? `𖠰 ${worktree}` : worktree;
        }

        if (hideNoGit) {
            return null;
        }
        return withIcon ? '𖠰 no git' : 'no git';
    }

    private getGitWorktree(): string | null {
        try {
            const worktreeDir = execSync('git rev-parse --git-dir', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();

            // /some/path/.git or .git
            if (worktreeDir.endsWith('/.git') || worktreeDir === '.git')
                return 'main';

            // /some/path/.git/worktrees/some-worktree or /some/path/.git/worktrees/some-dir/some-worktree
            const [, worktree] = worktreeDir.split('.git/worktrees/');

            return worktree ?? null;
        } catch {
            return null;
        }
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}