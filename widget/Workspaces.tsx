import { Gtk } from "ags/gtk4"
import { createComputed } from "ags"
import { activeWorkspace, switchWorkspace, workspaces } from "./hyprland"

const wsIds = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export function Workspaces() {
  return (
    <box class="workspaces" valign={Gtk.Align.CENTER}>
      {wsIds.map((id) => {
        const isActive = createComputed(() => activeWorkspace() === id)
        const isOccupied = createComputed(() =>
          workspaces().some((w) => w.id === id && w.windows > 0),
        )
        const btnClass = createComputed(() => {
          const classes = []
          if (isActive()) classes.push("active")
          if (isOccupied()) classes.push("occupied")
          return classes.join(" ")
        })
        const icon = createComputed(() =>
          isActive() ? "" : isOccupied() ? "" : "",
        )

        return (
          <button
            class={btnClass}
            tooltipText={`Workspace ${id}`}
            onClicked={() => {
              switchWorkspace(id).catch((err) =>
                console.error(`Failed to switch to workspace ${id}`, err),
              )
            }}
          >
            <label label={icon} />
          </button>
        )
      })}
    </box>
  )
}
