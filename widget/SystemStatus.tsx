import { Gtk } from "ags/gtk4"
import { createComputed, createState, For, With } from "ags"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"

interface WifiInfo {
  ssid: string
  signal: number
  connected: boolean
}

interface WifiAp {
  ssid: string
  security: string
  bssid: string
}

interface VolumeInfo {
  value: number
  muted: boolean
}

interface BatteryInfo {
  capacity: number
  status: string
  isPlugged: boolean
}

interface PowerProfile {
  id: string
  name: string
  icon: string
}

async function getWifiNetworks(): Promise<WifiAp[]> {
  try {
    const out = await execAsync([
      "nmcli",
      "-t",
      "-f",
      "SSID,SECURITY,BSSID",
      "dev",
      "wifi",
      "list",
    ])
    const lines = out.split("\n")
    const apList: WifiAp[] = []
    const seenSsid = new Set<string>()

    for (const line of lines) {
      if (!line.trim()) continue
      const parts = line.split(/(?<!\\):/).map((s) => s.replace(/\\:/g, ":"))
      if (parts.length >= 3) {
        const ssid = parts[0] || "[Hidden Network]"
        const security = parts[1]
        const bssid = parts[2]

        if (!seenSsid.has(ssid)) {
          seenSsid.add(ssid)
          apList.push({ ssid, security, bssid })
        }
      }
    }
    return apList
  } catch (err) {
    console.error("Failed to get wifi networks", err)
    return []
  }
}

export function SystemStatus() {
  const [selectedAp, setSelectedAp] = createState<WifiAp | null>(null)
  const [password, setPassword] = createState<string>("")
  const [statusText, setStatusText] = createState<string>("")
  const [wifiEnabled, setWifiEnabled] = createState<boolean>(true)

  const [currentPowerProfile, setCurrentPowerProfile] = createState<string>("balanced")

  // Poll current power profile
  createPoll<string>("balanced", 5000, async () => {
    try {
      const out = await execAsync(["powerprofilesctl", "get"])
      const profile = out.trim()
      setCurrentPowerProfile(profile)
      return profile
    } catch {
      return "balanced"
    }
  })

  const powerProfiles: PowerProfile[] = [
    { id: "power-saver", name: "Power Saver", icon: "󰌪" },
    { id: "balanced", name: "Balanced", icon: "󰗑" },
    { id: "performance", name: "Performance", icon: "󰓅" },
  ]

  // Poll to keep wifiEnabled synced with nmcli
  createPoll<boolean>(true, 5000, async () => {
    try {
      const out = await execAsync(["nmcli", "radio", "wifi"])
      const isEnabled = out.trim() === "enabled"
      setWifiEnabled(isEnabled)
      return isEnabled
    } catch {
      return false
    }
  })

  // Poll to fetch Wi-Fi list periodically
  const wifiNetworks = createPoll<WifiAp[]>([], 10000, async () => {
    if (wifiEnabled()) {
      return await getWifiNetworks()
    }
    return []
  })

  const wifiInfo = createPoll<WifiInfo>(
    { ssid: "Disconnected", signal: 0, connected: false },
    5000,
    async () => {
      try {
        const out = await execAsync([
          "nmcli",
          "-t",
          "-f",
          "ACTIVE,SSID,SIGNAL",
          "dev",
          "wifi",
        ])
        const activeLine = out
          .split("\n")
          .find((line) => line.startsWith("yes:"))
        if (activeLine) {
          const parts = activeLine.split(":")
          return {
            ssid: parts[1] || "",
            signal: parseInt(parts[2]) || 0,
            connected: true,
          }
        }
      } catch {}

      return { ssid: "Disconnected", signal: 0, connected: false }
    },
  )

  const wifiIcon = createComputed(() => {
    const info = wifiInfo()
    if (!info.connected) return "󰤮"
    if (info.signal < 25) return "󰤯"
    if (info.signal < 50) return "󰤟"
    if (info.signal < 75) return "󰤢"
    return ""
  })

  const wifiTooltip = createComputed(() => {
    const info = wifiInfo()
    return info.connected ? `${info.ssid} (${info.signal}%)` : "Disconnected"
  })

  const wifiClass = createComputed(() => {
    const info = wifiInfo()
    return `status-item wifi ${info.connected ? "connected" : "disconnected"}`
  })

  const volumeInfo = createPoll<VolumeInfo>(
    { value: 0, muted: false },
    1000,
    async () => {
      try {
        const out = await execAsync([
          "wpctl",
          "get-volume",
          "@DEFAULT_AUDIO_SINK@",
        ])
        const match = out.match(/Volume:\s+([0-9.]+)(?:\s+\[MUTED\])?/)
        if (match) {
          return {
            value: Math.round(parseFloat(match[1]) * 100),
            muted: out.includes("[MUTED]"),
          }
        }
      } catch {}

      return { value: 0, muted: false }
    },
  )

  const volumeIcon = createComputed(() => {
    const info = volumeInfo()
    if (info.muted) return ""
    return info.value > 33 ? "" : ""
  })

  const volumeLabel = createComputed(() => {
    const info = volumeInfo()
    return info.muted ? "Muted" : `${info.value}%`
  })

  const batteryInfo = createPoll<BatteryInfo>(
    { capacity: 100, status: "Unknown", isPlugged: false },
    5000,
    async () => {
      try {
        const cap = await execAsync([
          "sh",
          "-c",
          "cat /sys/class/power_supply/BAT*/capacity 2>/dev/null | head -n 1",
        ])
        const stat = await execAsync([
          "sh",
          "-c",
          "cat /sys/class/power_supply/BAT*/status 2>/dev/null | head -n 1",
        ])
        let isPlugged = false
        try {
          const ac = await execAsync([
            "sh",
            "-c",
            "cat /sys/class/power_supply/*/online 2>/dev/null",
          ])
          isPlugged = ac.split("\n").some((val) => val.trim() === "1")
        } catch {}

        return {
          capacity: parseInt(cap.trim()) || 0,
          status: stat.trim(),
          isPlugged,
        }
      } catch {}

      return { capacity: 100, status: "Unknown", isPlugged: false }
    },
  )

  const batteryIcon = createComputed(() => {
    const info = batteryInfo()
    const cap = info.capacity
    const isCharging = info.status === "Charging" || info.isPlugged

    if (isCharging) return ""
    if (cap > 80) return ""
    if (cap > 60) return ""
    if (cap > 40) return ""
    if (cap > 15) return ""
    return ""
  })

  const batteryClass = createComputed(() => {
    const info = batteryInfo()
    const classes = ["status-item", "battery"]
    const isCharging = info.status === "Charging" || info.isPlugged
    if (isCharging) classes.push("charging")
    if (info.capacity <= 15 && !isCharging) classes.push("low")
    return classes.join(" ")
  })

  return (
    <box class="sys-status-group" valign={Gtk.Align.CENTER} spacing={8}>
      <menubutton class={wifiClass} tooltipText={wifiTooltip} alwaysShowArrow={false}>
        <label label={wifiIcon} halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
        <popover>
          <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            css="min-width: 250px; padding: 6px;"
          >
            {/* Header: Title and Switch */}
            <box spacing={8} valign={Gtk.Align.CENTER}>
              <label
                label="Wi-Fi Networks"
                hexpand
                halign={Gtk.Align.START}
                class="sys-title"
              />
              <switch
                active={wifiEnabled}
                onNotifyActive={async (self) => {
                  const active = self.active
                  try {
                    await execAsync([
                      "nmcli",
                      "radio",
                      "wifi",
                      active ? "on" : "off",
                    ])
                    setWifiEnabled(active)
                  } catch (err) {
                    console.error("Failed to toggle wifi radio", err)
                  }
                }}
              />
            </box>

            {/* Separator */}
            <box css="background-color: rgba(255, 255, 255, 0.1); min-height: 1px;" />

            {/* Placeholders */}
            <label
              label="Wi-Fi is disabled"
              class="sys-text-muted"
              visible={createComputed(() => !wifiEnabled())}
            />

            <label
              label="Scanning..."
              class="sys-text-muted"
              visible={createComputed(
                () => wifiEnabled() && wifiNetworks().length === 0,
              )}
            />

            {/* Network List */}
            <scrolledwindow
              minContentHeight={150}
              propagateNaturalHeight={false}
              hscrollbarPolicy={Gtk.PolicyType.NEVER}
              visible={createComputed(
                () => wifiEnabled() && wifiNetworks().length > 0,
              )}
            >
              <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                <For each={wifiNetworks}>
                  {(ap) => {
                    const isSecured =
                      ap.security &&
                      ap.security !== "" &&
                      ap.security !== "none"
                    const isActive = createComputed(
                      () => wifiInfo().ssid === ap.ssid && wifiInfo().connected,
                    )
                    return (
                      <button
                        class="wifi-ap-row"
                        onClicked={() => {
                          setSelectedAp(ap)
                          setPassword("")
                          setStatusText("")
                        }}
                      >
                        <box spacing={6} valign={Gtk.Align.CENTER}>
                          <label
                            label={isSecured ? "" : ""}
                            css="color: #94a3b8;"
                          />
                          <label
                            label={ap.ssid}
                            hexpand
                            halign={Gtk.Align.START}
                            class="sys-text"
                          />
                          <label
                            label=""
                            visible={isActive}
                            css="color: #34d399;"
                          />
                        </box>
                      </button>
                    )
                  }}
                </For>
              </box>
            </scrolledwindow>

            {/* Connection Dialog */}
            <With value={selectedAp}>
              {(ap) => {
                if (!ap) return <box />
                const isSecured =
                  ap.security && ap.security !== "" && ap.security !== "none"
                const isConnected = createComputed(
                  () => wifiInfo().ssid === ap.ssid && wifiInfo().connected,
                )
                return (
                  <box
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={6}
                    css="background: rgba(255, 255, 255, 0.05); padding: 8px; border-radius: 6px;"
                  >
                    <label
                      label={createComputed(() => isConnected() ? `Connected to ${ap.ssid}` : `Connect to ${ap.ssid}`)}
                      halign={Gtk.Align.START}
                      class="sys-text font-medium"
                    />

                    {isSecured && (
                      <entry
                        placeholderText="Password..."
                        visibility={false}
                        onNotifyText={(self) => setPassword(self.text)}
                        visible={createComputed(() => !isConnected())}
                      />
                    )}

                    <box spacing={6} halign={Gtk.Align.END}>
                      <button
                        class="wifi-dialog-btn cancel"
                        label="Cancel"
                        onClicked={() => setSelectedAp(null)}
                      />
                      <button
                        class="wifi-dialog-btn disconnect"
                        label="Disconnect"
                        visible={isConnected}
                        onClicked={async () => {
                          setStatusText("Disconnecting...")
                          try {
                            await execAsync(["nmcli", "connection", "down", "id", ap.ssid])
                            setStatusText("Disconnected")
                            setSelectedAp(null)
                          } catch (err: any) {
                            console.error("Failed to disconnect from wifi", err)
                            setStatusText("Failed to disconnect")
                          }
                        }}
                      />
                      <button
                        class="wifi-dialog-btn connect"
                        label="Connect"
                        visible={createComputed(() => !isConnected())}
                        onClicked={async () => {
                          setStatusText("Connecting...")
                          try {
                            const cmd = [
                              "nmcli",
                              "dev",
                              "wifi",
                              "connect",
                              ap.bssid,
                            ]
                            if (isSecured) {
                              cmd.push("password", password())
                            }
                            await execAsync(cmd)
                            setStatusText("Connected successfully!")
                            setSelectedAp(null)
                          } catch (err: any) {
                            console.error("Failed to connect to wifi", err)
                            setStatusText("Failed to connect")
                          }
                        }}
                      />
                    </box>

                    <label
                      label={statusText}
                      visible={createComputed(() => statusText() !== "")}
                      halign={Gtk.Align.START}
                      class="sys-status-msg"
                    />
                  </box>
                )
              }}
            </With>
          </box>
        </popover>
      </menubutton>

      <box class="volume-control" valign={Gtk.Align.CENTER} spacing={4}>
        <button
          class={createComputed(
            () => `volume-icon-btn ${volumeInfo().muted ? "muted" : ""}`,
          )}
          tooltipText={createComputed(() => `Volume: ${volumeLabel()}`)}
          onClicked={() => {
            execAsync([
              "wpctl",
              "set-mute",
              "@DEFAULT_AUDIO_SINK@",
              "toggle",
            ]).catch((err) => console.error("Failed to toggle mute", err))
          }}
        >
          <label label={volumeIcon} />
        </button>
        <slider
          class="volume-slider"
          value={createComputed(() => volumeInfo().value / 100)}
          onNotifyValue={(self) => {
            const val = Math.round(self.value * 100)
            execAsync([
              "wpctl",
              "set-volume",
              "@DEFAULT_AUDIO_SINK@",
              `${val}%`,
            ]).catch((err) => console.error("Failed to set volume", err))
          }}
        />
      </box>

      <menubutton
        class={batteryClass}
        tooltipText={createComputed(
          () => `Battery: ${batteryInfo().capacity}% (${batteryInfo().status})`,
        )}
      >
        <box spacing={6} valign={Gtk.Align.CENTER}>
          <label label={batteryIcon} />
          <label label={createComputed(() => `${batteryInfo().capacity}%`)} />
        </box>
        <popover>
          <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={8}
            css="min-width: 180px; padding: 6px;"
          >
            <label
              label="Power Profiles"
              halign={Gtk.Align.START}
              class="sys-title"
            />
            <box css="background-color: rgba(255, 255, 255, 0.1); min-height: 1px;" />
            <box orientation={Gtk.Orientation.VERTICAL} spacing={4}>
              {powerProfiles.map((profile) => {
                const isActive = createComputed(() => currentPowerProfile() === profile.id)
                return (
                  <button
                    class="profile-row"
                    onClicked={async () => {
                      try {
                        await execAsync(["powerprofilesctl", "set", profile.id])
                        setCurrentPowerProfile(profile.id)
                      } catch (err) {
                        console.error("Failed to set power profile", err)
                      }
                    }}
                  >
                    <box spacing={8} valign={Gtk.Align.CENTER}>
                      <label label={profile.icon} css="color: #94a3b8;" />
                      <label label={profile.name} hexpand halign={Gtk.Align.START} class="sys-text" />
                      <label label="" visible={isActive} css="color: #34d399;" />
                    </box>
                  </button>
                )
              })}
            </box>
          </box>
        </popover>
      </menubutton>

      <menubutton class="status-item power-btn" tooltipText="Power Options" alwaysShowArrow={false}>
        <label label="" halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER} />
        <popover>
          <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={4}
            css="min-width: 150px; padding: 6px;"
          >
            <button
              class="power-menu-item shutdown"
              onClicked={() => execAsync(["systemctl", "poweroff"]).catch(console.error)}
            >
              <box spacing={8} valign={Gtk.Align.CENTER}>
                <label label="" class="power-icon shutdown" />
                <label label="Shut Down" hexpand halign={Gtk.Align.START} class="sys-text" />
              </box>
            </button>
            <button
              class="power-menu-item reboot"
              onClicked={() => execAsync(["systemctl", "reboot"]).catch(console.error)}
            >
              <box spacing={8} valign={Gtk.Align.CENTER}>
                <label label="" class="power-icon reboot" />
                <label label="Restart" hexpand halign={Gtk.Align.START} class="sys-text" />
              </box>
            </button>
            <button
              class="power-menu-item suspend"
              onClicked={() => execAsync(["systemctl", "suspend"]).catch(console.error)}
            >
              <box spacing={8} valign={Gtk.Align.CENTER}>
                <label label="" class="power-icon suspend" />
                <label label="Sleep" hexpand halign={Gtk.Align.START} class="sys-text" />
              </box>
            </button>
            <button
              class="power-menu-item logout"
              onClicked={() => execAsync(["hyprctl", "dispatch", "exit"]).catch(console.error)}
            >
              <box spacing={8} valign={Gtk.Align.CENTER}>
                <label label="󰍃" class="power-icon logout" />
                <label label="Log Out" hexpand halign={Gtk.Align.START} class="sys-text" />
              </box>
            </button>
          </box>
        </popover>
      </menubutton>
    </box>
  )
}
