import { Gtk } from "ags/gtk4"
import { createComputed } from "ags"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { focusWindowByClass } from "./hyprland"
import { trayApps } from "./trayApps"

export function ProcessTray() {
  const activeApps = createPoll<string[]>([], 2000, async () => {
    const running: string[] = []

    for (const app of trayApps) {
      try {
        await execAsync(["pgrep", "-x", app.proc])
        running.push(app.class)
      } catch {}
    }

    return running
  })

  return (
    <box class="system-tray" valign={Gtk.Align.CENTER} spacing={6}>
      {trayApps.map((app) => {
        const isRunning = createComputed(() => activeApps().includes(app.class))

        return (
          <button
            visible={isRunning}
            class="tray-item"
            tooltipText={app.name}
            onClicked={() => {
              focusWindowByClass(app.class).catch((err) =>
                console.error(`Failed to focus ${app.name}`, err),
              )
            }}
          >
            <label label={app.icon} />
          </button>
        )
      })}
    </box>
  )
}
