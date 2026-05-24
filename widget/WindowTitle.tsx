import { Gtk } from "ags/gtk4"
import { createComputed } from "ags"
import { activeTitle } from "./hyprland"

export function WindowTitle() {
  const windowIcon = createComputed(() => {
    const title = activeTitle().toLowerCase()
    if (title.includes("firefox")) return ""
    if (title.includes("code") || title.includes("visual studio code"))
      return "󰨞"
    if (
      title.includes("terminal") ||
      title.includes("kitty") ||
      title.includes("alacritty")
    ) {
      return ""
    }
    if (title.includes("spotify")) return ""
    if (title.includes("discord")) return ""
    if (title.includes("steam")) return ""
    return ""
  })

  const truncatedTitle = createComputed(() => {
    const title = activeTitle()
    if (!title) return "Desktop"
    return title.length > 35 ? `${title.substring(0, 32)}...` : title
  })

  return (
    <box class="window-title" valign={Gtk.Align.CENTER} spacing={6}>
      <label class="icon" label={windowIcon} />
      <label label={truncatedTitle} />
    </box>
  )
}
