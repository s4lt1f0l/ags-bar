export interface TrayApp {
  name: string
  icon: string
  class: string
  proc: string
}

export const trayApps: TrayApp[] = [
  { name: "Firefox", icon: "", class: "firefox", proc: "firefox" },
  { name: "VS Code", icon: "󰨞", class: "code", proc: "code" },
  { name: "Discord", icon: "", class: "discord", proc: "discord" },
  { name: "Spotify", icon: "", class: "spotify", proc: "spotify" },
  { name: "Steam", icon: "", class: "steam", proc: "steam" },
  { name: "Terminal", icon: "", class: "kitty", proc: "kitty" },
]
