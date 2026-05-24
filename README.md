# AGS GTK4 Status Bar Configuration

A modern status bar configuration for Aylur's GTK Shell (AGS) v2, built with GTK4, TypeScript, and SCSS. This configuration features workspace indicators, active window title tracking, a clock, process tray, and comprehensive system status widgetry.

---

## Getting Started

### Prerequisites

Before running this configuration, ensure you have the following installed on your system:

1. **Aylur's GTK Shell (AGS) v2** (configured with GTK4 support).
2. **Node.js** (v18 or higher recommended) and **npm**.
3. **Hyprland** (optional, but workspaces and window title widgets are built specifically for Hyprland).

### Installation

Clone this repository directly to your `.config` directory (or symlink it):

```bash
# Clone to ~/.config/ags
git clone https://github.com/s4lt1f0l/ags-bar.git ~/.config/ags
cd ~/.config/ags

# Install TypeScript type definitions and tooling
npm install
```

---

## Running the Status Bar

You can run this configuration in two different modes:

### 1. Development Mode (with Hot-Reload)

This is the recommended way to run the configuration when making changes. It monitors your TypeScript (`.ts`, `.tsx`), stylesheet (`.scss`, `.css`), and configuration (`.json`) files. Whenever a change is detected, it automatically rebuilds and restarts the status bar.

```bash
npm run dev
```

> [!NOTE]
> Under the hood, this script runs [watch.js](file:///home/me/.config/ags/watch.js), which manages the file watcher and spawns the `ags` process.

### 2. Standard Production Mode

To run the status bar without watching for file changes:

```bash
ags run app.ts
```

---

## File Structure

The project structure is organized as follows:

*   **[app.ts](file:///home/me/.config/ags/app.ts)**: The primary entry point. Initializes the GTK4 application and instantiates the main `Bar` widget for all connected monitors.
*   **[style.scss](file:///home/me/.config/ags/style.scss)**: Custom styles written in SCSS. Imported directly by [app.ts](file:///home/me/.config/ags/app.ts).
*   **[watch.js](file:///home/me/.config/ags/watch.js)**: A recursive hot-reloading development script.
*   **[widget/](file:///home/me/.config/ags/widget)**: Status bar component widgets:
    *   **[Bar.tsx](file:///home/me/.config/ags/widget/Bar.tsx)**: Assembles widgets into a layout (Start, Center, End).
    *   **[Clock.tsx](file:///home/me/.config/ags/widget/Clock.tsx)**: Displays time and date.
    *   **[ProcessTray.tsx](file:///home/me/.config/ags/widget/ProcessTray.tsx)**: Manages background applications and indicators.
    *   **[SystemStatus.tsx](file:///home/me/.config/ags/widget/SystemStatus.tsx)**: Displays status indicators (battery, network, audio, CPU, RAM, etc.).
    *   **[WindowTitle.tsx](file:///home/me/.config/ags/widget/WindowTitle.tsx)**: Displays the currently focused window title from Hyprland.
    *   **[Workspaces.tsx](file:///home/me/.config/ags/widget/Workspaces.tsx)**: Multi-workspace switcher indicator.
    *   **[hyprland.ts](file:///home/me/.config/ags/widget/hyprland.ts)**: Hyprland socket & IPC service wrapper.
