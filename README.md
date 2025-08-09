# Folder Time Tracker Extension for VSCodium

[![Version](https://img.shields.io/badge/version-0.0.4-blue.svg)](https://github.com/purplebyte24/timetracker/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/purplebyte24/timetracker/?tab=MIT-1-ov-file)


A simple VSCodium extension to track **active time spent working inside specific folders** in your workspace. Completely local and open-source.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Limitations](#limitations)
- [File Storage](#file-storage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Credits](#credits)
- [License](#license)

---

## Overview

This extension monitors the time you spend in selected folders in your workspace. It stops counting after 5 minutes of inactivity, and stores logs automatically in your home directory under `VSCodiumTimeLogs`.

---

## Features

- Track multiple folders via add/remove commands
- Timer auto-starts when a tracked folder is open; stops on close or 5 minutes idle
- Continues timing even if VSCodium loses focus, if user remains active
- Idle detection (no editor changes/window focus for 5 minutes) pauses tracking
- Periodically saves data every 30 seconds for reliability
- Status bar displays elapsed time for the current tracked folder
- Tracked folders are managed via the `folder-time-tracker.trackedFolders` config

---

## Installation

1. Clone or download this repository
2. Compile and package it as a VSCodium extension, or run in development mode
3. Install in VSCodium
4. Use the commands `folder-time-tracker.addFolder` and `folder-time-tracker.removeFolder` to manage folders

You can also download the extension from the [**Releases**](https://github.com/purplebyte24/TimeTracker/releases) tab.

---

## Usage

- Open the **Command Palette** (`Ctrl+Shift+P`/`Cmd+Shift+P`) and search:
  - `Folder Time Tracker: Add Folder`
  - `Folder Time Tracker: Remove Folder`
- Status bar shows time on active tracked folder
- Time is tracked while the folder is in your workspace and you are active
- Logs stop and save when a folder is removed or idle for 5 minutes
- Time data saved in JSON under `~/VSCodiumTimeLogs`

---

## Limitations

- Tested only on macOS and Linux (uses home directory path conventions)
- Idle detection relies on activity in VSCodium, not system-wide inactivity
- Folders must be in the current workspace to be tracked

---

## File Storage

Tracked time per folder is saved as:

`~/VSCodiumTimeLogs/{encoded-folder-path}.json`

Each file contains:
```json
{
    “totalTime”: 12345678,
    “updated”: “2025-08-09T12:34:56.789Z”
}
```
- `totalTime` is in milliseconds.

---

## Troubleshooting

- **No logs?** Check that the `VSCodiumTimeLogs` directory is writable and exists.
- **Idle not detected?** Ensure you are active in the editor; system idle does not pause tracking.
- **Windows support?** Not yet; currently for macOS/Linux only.

---

## Contributing

Fork, open an issue, or submit a pull request! All contributions and feature requests are welcome.

---

## Credits

Created with the help of ChatGPT (OpenAI).

---

## License

MIT License
