# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ccstatusline is a customizable status line formatter for Claude Code CLI that displays model info, git branch, token usage, and other metrics. It functions as both:
1. A piped command processor for Claude Code status lines
2. An interactive TUI configuration tool when run without input

## Development Commands

```bash
# Install dependencies
npm install

# Run with patch (TUI mode)
npm run start

# Test with piped input
echo '{"model":{"display_name":"Claude 3.5 Sonnet"},"transcript_path":"test.jsonl"}' | npm run start

# Build for npm distribution
npm run build   # Creates dist/ccstatusline.js with Node.js 14+ compatibility

# Lint and type check
npm run lint   # Runs TypeScript type checking and ESLint with auto-fix

# Using Makefile (auto-detects npm or bun)
make build    # Build the project
make run      # Build and run the TUI
```

## Architecture

The project has dual runtime compatibility - works with both Bun and Node.js:

### Core Structure
- **src/ccstatusline.ts**: Main entry point that detects piped vs interactive mode
  - Piped mode: Parses JSON from stdin and renders formatted status line
  - Interactive mode: Launches React/Ink TUI for configuration

### TUI Components (src/tui/)
- **index.tsx**: Main TUI entry point that handles React/Ink initialization
- **App.tsx**: Root component managing navigation and state
- **components/**: Modular UI components for different configuration screens
  - MainMenu, LineSelector, ItemsEditor, ColorMenu, GlobalOverridesMenu
  - PowerlineSetup, TerminalOptionsMenu, StatusLinePreview

### Utilities (src/utils/)
- **config.ts**: Settings management
  - Loads from `~/.config/ccstatusline/settings.json`
  - Handles migration from old settings format
  - Default configuration if no settings exist
- **renderer.ts**: Core rendering logic for status lines
  - Handles terminal width detection and truncation
  - Applies colors, padding, and separators
  - Manages flex separator expansion
- **powerline.ts**: Powerline font detection and installation
- **claude-settings.ts**: Integration with Claude Code settings.json
  - Respects `CLAUDE_CONFIG_DIR` environment variable with fallback to `~/.claude`
  - Provides installation command constants (NPM, BUNX, self-managed)
  - Detects installation status and manages settings.json updates
  - Validates config directory paths with proper error handling
- **colors.ts**: Color definitions and ANSI code mapping

### Widgets (src/widgets/)
Custom widgets implementing the StatusItemWidget interface:
- Model, Version, OutputStyle - Claude Code metadata display
- GitBranch, GitChanges - Git repository status
- TokensInput, TokensOutput, TokensCached, TokensTotal - Token usage metrics
- ContextLength, ContextPercentage, ContextPercentageUsable - Context window metrics
- BlockTimer, SessionClock - Time tracking
- CurrentWorkingDir, TerminalWidth - Environment info

## Key Implementation Details

- **Cross-platform stdin reading**: Detects Bun vs Node.js environment and uses appropriate stdin API
- **Token metrics**: Parses Claude Code transcript files (JSONL format) to calculate token usage
- **Git integration**: Uses child_process.execSync to get current branch and changes
- **Terminal width management**: Three modes for handling width (full, full-minus-40, full-until-compact)
- **Flex separators**: Special separator type that expands to fill available space
- **Powerline mode**: Optional Powerline-style rendering with arrow separators
- **Custom commands**: Execute shell commands and display output in status line
- **Mergeable items**: Items can be merged together with or without padding

## Important Notes

- **patch-package**: The project uses patches for ink compatibility (managed via patchedDependencies in package.json)
- **ESLint configuration**: Uses flat config format (eslint.config.js) with TypeScript and React plugins
- **Build target**: When building for distribution, target Node.js 14+ for maximum compatibility
- **Dependencies**: All runtime dependencies are bundled using `--packages=external` for npm package
- **Type checking and linting**: Only run via `npm run lint` command, never using `npx eslint` or `eslint` directly. Never run `tsx`, `tsc` or any other variation
- **Lint rules**: Never disable a lint rule via a comment, no matter how benign the lint warning or error may seem
- **Testing**: No test framework is currently configured. Manual testing is done via piped input and TUI interaction