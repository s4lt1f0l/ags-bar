import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"

export function Clock() {
  const formattedTime = createPoll("", 1000, "date '+%I:%M:%S %p - %a, %b %d'")

  return (
    <box class="clock-container" valign={Gtk.Align.CENTER}>
      <menubutton
        class="clock-pill"
        valign={Gtk.Align.FILL}
        halign={Gtk.Align.FILL}
      >
        <label label={formattedTime} />
        <popover>
          <box class="calendar-popover-box">
            <Gtk.Calendar />
          </box>
        </popover>
      </menubutton>
    </box>
  )
}
