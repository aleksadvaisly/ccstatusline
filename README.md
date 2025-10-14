# ccstatusline

![Created with AI agents](docs/small_create_with_ai.png)

Customizable status line formatter for Claude Code CLI. Displays model info, git branch, token usage, and other metrics.

## Installation

No installation required. Run directly with npx:

```bash
npx ccstatusline@latest
```

Or with Bun for faster startup:

```bash
bunx ccstatusline@latest
```

## Usage

The interactive TUI lets you configure:
- Multiple status lines
- Widget selection and ordering
- Colors for each widget
- Powerline mode with custom separators
- Global formatting options

Settings are saved to `~/.config/ccstatusline/settings.json`

### Claude Code Integration

Edit `~/.claude/settings.json`:

```json
{
  "statusLine": "npx ccstatusline@latest"
}
```

Or with Bun:

```json
{
  "statusLine": "bunx ccstatusline@latest"
}
```

### Custom Config Directory

Set `CLAUDE_CONFIG_DIR` environment variable to use non-standard Claude Code config location:

```bash
export CLAUDE_CONFIG_DIR=/custom/path/to/.claude
```

## Features

- Real-time metrics: model name, git branch, token usage, session duration, block timer
- Powerline mode with arrow separators and custom fonts
- Multi-line support
- Interactive TUI for configuration
- Global formatting options (padding, separators, bold, background)
- Cross-platform: Node.js 18+ (Bun optional)
- Smart width detection with flex separators
- Context scaling factor (1.04) for percentage calculations

## Available Widgets

- Model Name
- Git Branch
- Git Changes (insertions, deletions, commits ahead, untracked files)
- Git Worktree
- Session Clock
- Session Cost
- Block Timer (time/progress bar modes)
- Current Working Directory
- Version
- Output Style
- Token metrics (input, output, cached, total)
- Context Length
- Context Percentage (200k limit)
- Context Percentage Usable (160k before auto-compact)
- Terminal Width
- Custom Text
- Custom Command (shell command output)
- Separator (|, -, comma, space)
- Flex Separator (expands to fill space)

## Terminal Width Options

- Full width always
- Full width minus 40 (default, reserves space for auto-compact message)
- Full width until compact (dynamic based on context percentage)

## Development

Requirements:
- Node.js 18+
- Git
- Bun (optional, for faster development)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/ccstatusline.git
cd ccstatusline
npm install
```

Or with Bun:

```bash
bun install
```

### Commands

```bash
# Run TUI
npm run start

# Build
npm run build

# Lint and type check
npm run lint

# Generate API docs
npm run docs
```

Or with Makefile:

```bash
make          # Show available targets
make build    # Build project
make run      # Build and run TUI
```

Makefile auto-detects bun or npm.

### Testing Local Changes

```bash
# Build project
npm run build

# Update ~/.claude/settings.json to point to local build
{
  "statusLine": "node /absolute/path/to/ccstatusline/dist/ccstatusline.js"
}
```

## Project Structure

```
ccstatusline/
├── src/
│   ├── ccstatusline.ts         # Main entry point
│   ├── tui/                    # React/Ink UI
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── components/
│   ├── widgets/                # Widget implementations
│   ├── utils/                  # Utilities
│   │   ├── config.ts
│   │   ├── renderer.ts
│   │   ├── powerline.ts
│   │   └── claude-settings.ts
│   └── types/                  # TypeScript types
├── dist/                       # Built files
└── package.json
```

## Windows Support

Works on PowerShell, Command Prompt, and WSL. Requires Powerline-compatible font for optimal rendering.

Install JetBrains Mono Nerd Font:

```powershell
winget install DEVCOM.JetBrainsMonoNerdFont
```

Git must be in PATH. Install if needed:

```powershell
winget install Git.Git
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/name`)
5. Open Pull Request

## License

MIT © Matthew Breedlove

## Author

Matthew Breedlove - [@sirmalloc](https://github.com/sirmalloc)

## Related Projects

- [tweakcc](https://github.com/Piebald-AI/tweakcc) - Customize Claude Code themes and settings
- [ccusage](https://github.com/ryoppippi/ccusage) - Track Claude Code usage metrics
