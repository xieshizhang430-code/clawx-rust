# ClawX-Rust

Desktop interface for OpenClaw AI Agents - Rust implementation using Tauri

## Features

- **Chat Interface** - Communicate with AI agents through a modern chat experience
- **Multi-Channel Management** - Configure and monitor multiple AI channels
- **Skill System** - Extend AI agents with pre-built skills
- **Cron Automation** - Schedule AI tasks to run automatically
- **Settings** - Language, theme, and startup configuration

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop Runtime | Tauri 2.x |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Build | Vite |

## Prerequisites

- Node.js 18+
- Rust 1.70+
- pnpm (recommended) or npm

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

```bash
pnpm run tauri dev
```

### Build

```bash
pnpm run tauri build
```

## Project Structure

```
clawx-rust/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── stores/             # Zustand state stores
│   └── lib/                # Utilities
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri commands
│   │   ├── state.rs        # Application state
│   │   ├── lib.rs          # Library entry
│   │   └── main.rs         # Binary entry
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## Development Commands

| Command | Description |
| --- | --- |
| `pnpm run dev` | Start Vite dev server |
| `pnpm run build` | Build frontend |
| `pnpm run tauri dev` | Start Tauri in dev mode |
| `pnpm run tauri build` | Build production binary |

## License

MIT
