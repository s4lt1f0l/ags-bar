const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

let agsProcess = null
const watchedDirs = new Set()
const watchers = []

function startAgs() {
  if (agsProcess) {
    console.log("[Watcher] Killing existing AGS instance...")
    agsProcess.kill()
    agsProcess = null
  }

  console.log("[Watcher] Starting AGS...")
  agsProcess = spawn("ags", ["run", "app.ts"], { stdio: "inherit" })

  agsProcess.on("close", (code) => {
    if (code !== null && code !== 0) {
      console.log(`[Watcher] AGS exited with code ${code}`)
    }
  })
}

// Watch directory recursively
function watchDirectoryRecursive(dirPath, onChange) {
  if (watchedDirs.has(dirPath)) return
  watchedDirs.add(dirPath)

  try {
    const watcher = fs.watch(dirPath, (eventType, filename) => {
      if (filename) {
        const fullPath = path.join(dirPath, filename)
        // If a new directory is created, watch it
        try {
          const stats = fs.statSync(fullPath)
          if (stats.isDirectory()) {
            watchDirectoryRecursive(fullPath, onChange)
          }
        } catch (_) {}

        // Call onChange with the filename
        onChange(filename)
      }
    })
    watchers.push(watcher)
  } catch (err) {
    console.error(`[Watcher] Failed to watch ${dirPath}:`, err.message)
  }

  // Read children to find nested subdirectories
  try {
    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file.startsWith(".")) {
        continue
      }
      const fullPath = path.join(dirPath, file)
      try {
        const stats = fs.statSync(fullPath)
        if (stats.isDirectory()) {
          watchDirectoryRecursive(fullPath, onChange)
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error(`[Watcher] Failed to read ${dirPath}:`, err.message)
  }
}

let debounceTimeout = null
function handleFileChange(filename) {
  // Only watch relevant extensions
  if (
    !filename.endsWith(".ts") &&
    !filename.endsWith(".tsx") &&
    !filename.endsWith(".scss") &&
    !filename.endsWith(".css") &&
    !filename.endsWith(".json")
  ) {
    return
  }

  console.log(`[Watcher] Change detected in: ${filename}`)

  if (debounceTimeout) clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    console.log("[Watcher] Reloading AGS...")
    // Terminate existing AGS instances cleanly
    const quitProc = spawn("ags", ["quit"])
    quitProc.on("exit", () => {
      startAgs()
    })
  }, 150) // Debounce time to avoid multiple triggers on multi-file save/format
}

// Clean up watchers and processes on exit
process.on("SIGINT", () => {
  console.log("\n[Watcher] Stopping...")
  for (const w of watchers) {
    w.close()
  }
  const quitProc = spawn("ags", ["quit"])
  quitProc.on("exit", () => {
    process.exit(0)
  })
})

console.log("[Watcher] Initializing file watchers...")
watchDirectoryRecursive(".", handleFileChange)

// Run ags quit to make sure we clean up any pre-existing instances, then start
const initialQuit = spawn("ags", ["quit"])
initialQuit.on("exit", () => {
  startAgs()
})
