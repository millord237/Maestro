# Contributing to Maestro

Thank you for your interest in contributing to Maestro! This document provides guidelines, setup instructions, and architectural information for developers.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Development Scripts](#development-scripts)
- [Architecture](#architecture)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Building for Release](#building-for-release)
- [GitHub Actions Workflow](#github-actions-workflow)

## Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- Git

### Getting Started

```bash
# Fork and clone the repository
git clone <your-fork-url>
cd maestro

# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev
```

## Project Structure

```
maestro/
├── src/
│   ├── main/              # Electron main process (Node.js backend)
│   │   ├── utils/         # Shared utilities
│   │   └── ...            # Process management, IPC, web server
│   └── renderer/          # React frontend (UI)
│       ├── components/    # React components (UI elements, modals, panels)
│       ├── hooks/         # Custom React hooks (reusable state logic)
│       ├── services/      # Business logic services (git, process management)
│       ├── types/         # TypeScript definitions
│       ├── utils/         # Frontend utilities
│       └── constants/     # App constants (themes, shortcuts, emojis)
├── build/                 # Application icons
├── .github/workflows/     # CI/CD automation
└── dist/                  # Build output (generated)
```

## Tech Stack

### Backend (Electron Main Process)

- **Electron 28+** - Desktop application framework
- **TypeScript** - Type-safe JavaScript
- **node-pty** - Terminal emulation for shell sessions
- **Fastify** - High-performance web server for remote access
- **electron-store** - Persistent settings storage

### Frontend (Renderer Process)

- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **Lucide React** - Icon library
- **marked** - Markdown rendering
- **react-syntax-highlighter** - Code syntax highlighting
- **ansi-to-html** - Terminal ANSI escape code rendering
- **dompurify** - HTML sanitization for XSS prevention
- **emoji-mart** - Emoji picker component

## Development Scripts

```bash
# Start dev server with hot reload
npm run dev

# Build main process only (Electron backend)
npm run build:main

# Build renderer only (React frontend)
npm run build:renderer

# Full production build
npm run build

# Start built application
npm start

# Clean build artifacts and cache
npm run clean
```

## Architecture

### Process Management

Maestro uses a dual-process architecture where **each session runs two processes simultaneously**:

1. **AI Agent Process** - Runs Claude Code as a child process
2. **Terminal Process** - Runs a PTY shell session for command execution

This architecture enables seamless switching between AI and terminal modes without process restarts. All processes are managed through IPC (Inter-Process Communication) with secure context isolation.

### Security Model

Maestro implements strict security measures:

- **Context isolation enabled** - Renderer has no direct Node.js access
- **No node integration in renderer** - No `require()` in renderer process
- **Secure IPC via preload script** - Minimal API exposed via `contextBridge`
- **No shell injection** - Uses `execFile` instead of `exec`
- **Input sanitization** - All user inputs are validated

### Main Process (Backend)

Located in `src/main/`:

- `index.ts` - Application entry point, IPC handler registration, window management
- `process-manager.ts` - Core primitive for spawning and managing CLI processes
- `web-server.ts` - Fastify-based HTTP/WebSocket server for remote access
- `agent-detector.ts` - Auto-detects available AI tools via PATH
- `preload.ts` - Secure IPC bridge via contextBridge

### Renderer Process (Frontend)

Located in `src/renderer/`:

- `App.tsx` - Main UI coordinator
- `main.tsx` - Renderer entry point
- `components/` - React components (modals, panels, UI elements)
- `hooks/` - Custom React hooks for reusable state logic
- `services/` - Business logic services (clean wrappers around IPC calls)
- `constants/` - Application constants (themes, shortcuts, etc.)

## Code Style

### TypeScript

- All code must be TypeScript with strict mode enabled
- Define interfaces for all data structures
- Export types via `preload.ts` for renderer types

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use Tailwind CSS for styling
- Maintain keyboard accessibility
- Use inline styles for theme colors, Tailwind for layout

### Architecture Guidelines

**Main Process:**
- Keep IPC handlers simple and focused
- Use TypeScript interfaces for all data structures
- Handle errors gracefully
- No blocking operations

**Renderer Process:**
- Use React hooks
- Keep components small and focused
- Use Tailwind for styling
- Maintain keyboard accessibility

**Security:**
- Never expose Node.js APIs to renderer
- Use preload script for all IPC
- Sanitize all user inputs
- Use `execFile` instead of `exec`

## Commit Messages

Use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Build process or tooling changes

Example: `feat: add context usage visualization`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit PR with clear description
6. Wait for review

## Building for Release

### 1. Prepare Icons

Place your application icons in the `build/` directory:

- `icon.icns` - macOS (512x512 or 1024x1024)
- `icon.ico` - Windows (256x256)
- `icon.png` - Linux (512x512)

### 2. Update Version

Update version in `package.json`:

```json
{
  "version": "0.1.0"
}
```

### 3. Build Distributables

```bash
# Build for all platforms
npm run package

# Platform-specific builds
npm run package:mac    # Creates .dmg and .zip
npm run package:win    # Creates .exe installer
npm run package:linux  # Creates .AppImage, .deb, .rpm
```

Output will be in the `release/` directory.

## GitHub Actions Workflow

The project includes automated builds via GitHub Actions:

1. **Create a release tag:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. **GitHub Actions will automatically:**
   - Build for macOS, Windows, and Linux
   - Create release artifacts
   - Publish a GitHub Release with downloads

## Testing

```bash
# Run tests (when available)
npm test

# Type checking
npm run build:main
```

## Questions?

Open a GitHub Discussion or reach out in Issues.
