# Repository Guidelines

## Project Structure & Module Organization

This repository is an AGS/GTK4 TypeScript bar for Hyprland.

- `app.ts` is the application entry point. It loads `style.scss` and creates a `Bar` for each monitor.
- `widget/Bar.tsx` contains the GTK widget tree, workspace controls, clock, tray-like app shortcuts, and status widgets.
- `widget/hyprland.ts` owns Hyprland state polling and socket event handling.
- `style.scss` contains all visual styling for the bar and widgets.
- `env.d.ts`, `tsconfig.json`, and `@girs/` provide TypeScript and GObject introspection types.

There is currently no dedicated `tests/` directory or asset directory.

## Build, Test, and Development Commands

`package.json` defines dependencies but no scripts. Use direct tooling:

- `npm install` installs `ags` and `gnim`.
- `npx prettier --check .` checks formatting using the repository Prettier settings.
- `npx prettier --write .` formats TypeScript, TSX, SCSS, and JSON files.
- `npx tsc --noEmit` type-checks the project with `strict` TypeScript settings.
- `ags run app.ts` runs the bar locally in an AGS-capable Hyprland session.

Runtime widgets depend on `hyprctl`, `nmcli`, `wpctl`, `pgrep`, and `/sys/class/power_supply/BAT1`.

## Coding Style & Naming Conventions

Use strict TypeScript. Keep Hyprland integration in `widget/hyprland.ts`, bar UI composition in `widget/Bar.tsx`, and styling in `style.scss`.

Prettier is configured with no semicolons and `tabWidth: 2`; run it before submitting changes. Prefer `const`, typed interfaces for shared data shapes, and AGS reactive helpers such as `createState`, `createComputed`, and `createPoll`.

Name component functions in `PascalCase`, such as `Bar`. Name state values and helpers in `camelCase`, for example `activeWorkspace`, `batteryInfo`, and `updateState`.

## Testing Guidelines

No automated test framework is currently configured. For code changes, at minimum run:

- `npx tsc --noEmit`
- `npx prettier --check .`
- `ags run app.ts` in a Hyprland session for runtime verification

When adding tests later, prefer colocated `*.test.ts` files or a top-level `tests/` directory, and add the command to `package.json`.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so no project-specific convention can be inferred. Use concise, imperative commit messages such as `Add battery fallback handling`.

Pull requests should include a short summary, commands run, and screenshots or recordings for visible bar changes. Mention required services, environment variables, or hardware assumptions such as `HYPRLAND_INSTANCE_SIGNATURE`, NetworkManager, WirePlumber, or battery paths.

## Agent-Specific Instructions

Keep changes tightly scoped. Do not rewrite generated GI typings in `@girs/` unless explicitly required. Avoid broad styling rewrites when a targeted selector change is enough.

Always strictly adhere to the `karpathy-guidelines` skill (located at `/home/me/.gemini/config/skills/karpathy-guidelines/SKILL.md`). Specifically:

1. **Think Before Coding**: Don't assume or hide confusion. State assumptions, surface tradeoffs, and ask for clarification if anything is unclear before writing code.
2. **Simplicity First**: Write the minimum code required to solve the problem. Do not add speculative features, unused configurations, or unnecessary abstractions.
3. **Surgical Changes**: Touch only what you must. Do not improve or refactor adjacent code/formatting that is not broken. Clean up any unused imports, variables, or functions introduced by your changes.
4. **Goal-Driven Execution**: Define clear success criteria and verify all changes.
