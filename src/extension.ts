import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface FolderData {
  totalTime: number; // in ms
  updated: string;
}

interface TrackedFolder {
  path: string;
  timeSpent: number; // ms
  lastStart: number | null; // timestamp ms
}

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function activate(context: vscode.ExtensionContext) {
  const trackedFolders: Map<string, TrackedFolder> = new Map();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let activeFolder: TrackedFolder | null = null;

  const logFolder = path.join(os.homedir(), 'VSCodiumTimeLogs');
  if (!fs.existsSync(logFolder)) {
    fs.mkdirSync(logFolder);
  }

  const config = vscode.workspace.getConfiguration('folder-time-tracker');
  let trackedFolderPaths: string[] = config.get('trackedFolders') || [];

  function saveTrackedFolders(paths: string[]) {
    trackedFolderPaths = paths;
    config.update('trackedFolders', paths, vscode.ConfigurationTarget.Global);
  }

  function addTrackedFolder(folderPath: string) {
    if (!trackedFolderPaths.includes(folderPath)) {
      saveTrackedFolders([...trackedFolderPaths, folderPath]);
      vscode.window.showInformationMessage(`Added folder to tracking: ${folderPath}`);
      startTrackingIfFolderOpen();
    } else {
      vscode.window.showInformationMessage(`Folder already tracked: ${folderPath}`);
    }
  }

  function removeTrackedFolder(folderPath: string) {
    if (trackedFolderPaths.includes(folderPath)) {
      saveTrackedFolders(trackedFolderPaths.filter(p => p !== folderPath));
      vscode.window.showInformationMessage(`Removed folder from tracking: ${folderPath}`);
      if (activeFolder?.path === folderPath) {
        stopTracking();
        startTrackingIfFolderOpen();
      }
    } else {
      vscode.window.showInformationMessage(`Folder was not tracked: ${folderPath}`);
    }
  }

  function loadFolderData(folderPath: string): FolderData {
    const logFile = path.join(logFolder, encodeURIComponent(folderPath) + '.json');
    if (fs.existsSync(logFile)) {
      try {
        return JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      } catch {
        // ignore parse errors
      }
    }
    return { totalTime: 0, updated: new Date().toISOString() };
  }

  function saveFolderData(folder: TrackedFolder) {
    const logFile = path.join(logFolder, encodeURIComponent(folder.path) + '.json');
    const data: FolderData = {
      totalTime: folder.timeSpent,
      updated: new Date().toISOString(),
    };
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
  }

  function startTracking(folderPath: string) {
    if (!trackedFolderPaths.includes(folderPath)) {
      return;
    }
    if (activeFolder && activeFolder.path === folderPath) {
      return; // already tracking this folder
    }

    stopTracking();

    let folder = trackedFolders.get(folderPath);
    if (!folder) {
      const data = loadFolderData(folderPath);
      folder = {
        path: folderPath,
        timeSpent: data.totalTime,
        lastStart: null,
      };
      trackedFolders.set(folderPath, folder);
    }
    folder.lastStart = Date.now();
    activeFolder = folder;
    updateStatusBar();
  }

  function stopTracking() {
    if (activeFolder && activeFolder.lastStart !== null) {
      const now = Date.now();
      activeFolder.timeSpent += now - activeFolder.lastStart;
      activeFolder.lastStart = null;
      saveFolderData(activeFolder);
      activeFolder = null;
      updateStatusBar();
    }
  }

  function onIdle() {
    stopTracking();
  }

  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
  }

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.tooltip = 'Folder Time Tracker';
  context.subscriptions.push(statusBarItem);

  function updateStatusBar() {
    if (activeFolder) {
      let elapsed = activeFolder.timeSpent;
      if (activeFolder.lastStart !== null) {
        elapsed += (Date.now() - activeFolder.lastStart);
      }
      const seconds = Math.floor(elapsed / 1000) % 60;
      const minutes = Math.floor(elapsed / (60 * 1000)) % 60;
      const hours = Math.floor(elapsed / (60 * 60 * 1000));
      statusBarItem.text = `$(watch) ${hours}h ${minutes}m ${seconds}s`;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }

  function startTrackingIfFolderOpen() {
    const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [];
    const folderToTrack = trackedFolderPaths.find(p => workspaceFolders.includes(p));
    if (folderToTrack) {
      startTracking(folderToTrack);
      resetIdleTimer();
    } else {
      stopTracking();
    }
  }

  // New: Periodic saving every 30 seconds
  setInterval(() => {
    if (activeFolder && activeFolder.lastStart !== null) {
      const now = Date.now();
      activeFolder.timeSpent += now - activeFolder.lastStart;
      activeFolder.lastStart = now;
      saveFolderData(activeFolder);
    }
  }, 30 * 1000);

  vscode.window.onDidChangeActiveTextEditor(() => {
    resetIdleTimer();
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    startTrackingIfFolderOpen();
    resetIdleTimer();
  }, null, context.subscriptions);

  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('folder-time-tracker.trackedFolders')) {
      trackedFolderPaths = config.get('trackedFolders') || [];
      if (activeFolder && !trackedFolderPaths.includes(activeFolder.path)) {
        stopTracking();
      }
      startTrackingIfFolderOpen();
    }
  }, null, context.subscriptions);

  context.subscriptions.push(
    vscode.commands.registerCommand('folder-time-tracker.addFolder', async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select Folder to Track'
      });
      if (folderUri && folderUri[0]) {
        addTrackedFolder(folderUri[0].fsPath);
      }
    }),

    vscode.commands.registerCommand('folder-time-tracker.removeFolder', async () => {
      if (trackedFolderPaths.length === 0) {
        vscode.window.showInformationMessage('No folders currently tracked.');
        return;
      }
      const folderToRemove = await vscode.window.showQuickPick(trackedFolderPaths, {
        placeHolder: 'Select folder to stop tracking'
      });
      if (folderToRemove) {
        removeTrackedFolder(folderToRemove);
      }
    })
  );

  startTrackingIfFolderOpen();

  resetIdleTimer();

  setInterval(() => {
    updateStatusBar();
  }, 1000);
}

export function deactivate() {
  // nothing special for now
}