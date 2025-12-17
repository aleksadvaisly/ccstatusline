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

export class GitUserWidget implements Widget {
    getDefaultColor(): string { return 'cyan'; }
    getDescription(): string { return 'Shows the git user name and/or email from git config'; }
    getDisplayName(): string { return 'Git User'; }

    getAvailableStyles(): DisplayStyle[] {
        return [
            { id: 'name-only', label: 'aleksadvaisly' },
            { id: 'email-only', label: 'aleks.advaisly@gmail.com' },
            { id: 'name-with-email', label: 'aleksadvaisly (aleks.advaisly@gmail.com)' }
        ];
    }

    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        return { displayText: this.getDisplayName() };
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const style = item.displayStyle ?? 'name-only';

        if (context.isPreview) {
            switch (style) {
            case 'name-only':
                return 'aleksadvaisly';
            case 'email-only':
                return 'aleks.advaisly@gmail.com';
            case 'name-with-email':
                return 'aleksadvaisly (aleks.advaisly@gmail.com)';
            default:
                return 'aleksadvaisly';
            }
        }

        const userName = this.getGitUserName();
        const userEmail = this.getGitUserEmail();

        switch (style) {
        case 'name-only':
            return userName ?? 'n/a';
        case 'email-only':
            return userEmail ?? 'n/a';
        case 'name-with-email':
            if (userName && userEmail) {
                return `${userName} (${userEmail})`;
            } else if (userName) {
                return userName;
            } else if (userEmail) {
                return userEmail;
            } else {
                return 'n/a';
            }
        default:
            return userName ?? 'n/a';
        }
    }

    private getGitUserName(): string | null {
        try {
            const name = execSync('git config user.name', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            return name || null;
        } catch {
            return null;
        }
    }

    private getGitUserEmail(): string | null {
        try {
            const email = execSync('git config user.email', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            }).trim();
            return email || null;
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