import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { Clock } from "./Clock"
import { ProcessTray } from "./ProcessTray"
import { SystemStatus } from "./SystemStatus"
import { WindowTitle } from "./WindowTitle"
import { Workspaces } from "./Workspaces"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      visible
      name="bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox cssName="centerbox">
        <box
          $type="start"
          halign={Gtk.Align.START}
          valign={Gtk.Align.CENTER}
          spacing={8}
        >
          <Workspaces />
          <WindowTitle />
        </box>

        <box $type="center" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <Clock />
        </box>

        <box
          $type="end"
          halign={Gtk.Align.END}
          valign={Gtk.Align.CENTER}
          spacing={8}
        >
          <ProcessTray />
          <SystemStatus />
        </box>
      </centerbox>
    </window>
  )
}
