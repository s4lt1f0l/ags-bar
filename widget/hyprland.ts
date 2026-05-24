import Gio from "gi://Gio?version=2.0"
import GLib from "gi://GLib?version=2.0"
import { createState } from "ags"
import { execAsync } from "ags/process"

export interface Workspace {
  id: number
  name: string
  windows: number
}

const [activeWorkspace, setActiveWorkspace] = createState<number>(1)
const [workspaces, setWorkspaces] = createState<Workspace[]>([])
const [activeTitle, setActiveTitle] = createState<string>("")

async function updateState() {
  try {
    const wsStr = await execAsync(["hyprctl", "-j", "workspaces"])
    const wsData = JSON.parse(wsStr) as Workspace[]
    wsData.sort((a, b) => a.id - b.id)
    setWorkspaces(wsData)

    const activeStr = await execAsync(["hyprctl", "-j", "activeworkspace"])
    const activeData = JSON.parse(activeStr)
    setActiveWorkspace(activeData.id)

    const activeWindowStr = await execAsync(["hyprctl", "-j", "activewindow"])
    if (activeWindowStr.trim()) {
      const activeWindowData = JSON.parse(activeWindowStr)
      setActiveTitle(activeWindowData.title || "")
    } else {
      setActiveTitle("")
    }
  } catch (e) {
    console.error("Failed to update Hyprland state:", e)
  }
}

export async function switchWorkspace(id: number) {
  await execAsync(["hyprctl", "dispatch", "workspace", String(id)])
}

export async function focusWindowByClass(windowClass: string) {
  await execAsync([
    "hyprctl",
    "dispatch",
    "focuswindow",
    `class:${windowClass}`,
  ])
}

function setupSocket() {
  const signature = GLib.getenv("HYPRLAND_INSTANCE_SIGNATURE")
  if (!signature) {
    console.error("HYPRLAND_INSTANCE_SIGNATURE not found")
    return
  }

  const runtimeDir = GLib.getenv("XDG_RUNTIME_DIR") || "/run/user/1000"
  const socketPath = `${runtimeDir}/hypr/${signature}/.socket2.sock`

  const address = Gio.UnixSocketAddress.new(socketPath)
  const client = new Gio.SocketClient()

  client.connect_async(address, null, (_source, result) => {
    try {
      const connection = client.connect_finish(result)
      const inputStream = new Gio.DataInputStream({
        base_stream: connection.get_input_stream(),
      })

      function readLine() {
        inputStream.read_line_async(
          GLib.PRIORITY_DEFAULT,
          null,
          (_stream, res) => {
            try {
              const [line] = inputStream.read_line_finish_utf8(res)
              if (line !== null) {
                handleEvent(line)
                readLine()
              } else {
                connection.close(null)
                setTimeout(setupSocket, 2000)
              }
            } catch (e) {
              console.error("Hyprland socket read error:", e)
              connection.close(null)
              setTimeout(setupSocket, 2000)
            }
          },
        )
      }

      updateState()
      readLine()
    } catch (e) {
      console.error("Hyprland socket connection error, retrying in 2s:", e)
      setTimeout(setupSocket, 2000)
    }
  })
}

function handleEvent(line: string) {
  const parts = line.split(">>")
  if (parts.length < 2) return

  const eventName = parts[0]

  if (
    eventName === "workspace" ||
    eventName === "focusedmon" ||
    eventName === "createworkspace" ||
    eventName === "destroyworkspace" ||
    eventName === "moveworkspace" ||
    eventName === "activewindow" ||
    eventName === "activewindowv2" ||
    eventName === "closewindow" ||
    eventName === "openwindow"
  ) {
    updateState()
  }
}

setupSocket()

export { activeWorkspace, workspaces, activeTitle }
