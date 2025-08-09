// src/extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const TRACKED_FOLDERS = [
    ''
];
const LOGS_DIR = path.join(os.homedir(), 'VSCodiumTimeLogs');
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 min
const SAVE_INTERVAL_MS = 60 * 1000; // 1 min

let activeFolderPath: string | null = null;
let startTime: number | null = null;
let lastActivity: number = Date.now();
let totalTime: number = 0;
let saveTimer: NodeJS.Timeout | null = null;
let idleCheckTimer: NodeJS.Timeout | null = null;

export function activate(context: vscode.ExtensionContext) {
    // Ensure logs dir exists
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    // Detect when a folder is opened
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        const folderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (TRACKED_FOLDERS.includes(folderPath)) {
            activeFolderPath = folderPath;
            loadTime();
            startTracking();
        }
    }

    // Track activity
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => lastActivity = Date.now()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => lastActivity = Date.now()));

    // Stop tracking on close
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(() => {
        if (activeFolderPath) {
            saveTime();
        }
    }));

    // Command to manually save & show total time
    let disposable = vscode.commands.registerCommand('folderTimeTracker.showTime', () => {
        vscode.window.showInformationMessage(`Time spent on ${activeFolderPath}: ${formatTime(totalTime)}`);
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {
    if (activeFolderPath) {
        saveTime();
    }
    if (saveTimer) clearInterval(saveTimer);
    if (idleCheckTimer) clearInterval(idleCheckTimer);
}

function startTracking() {
    startTime = Date.now();
    saveTimer = setInterval(() => saveTime(), SAVE_INTERVAL_MS);
    idleCheckTimer = setInterval(checkIdle, 10 * 1000); // check every 10 sec
}

function checkIdle() {
    if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
        pauseTracking();
    }
}

function pauseTracking() {
    if (startTime) {
        totalTime += Date.now() - startTime;
        startTime = null;
        saveTime();
    }
}

function saveTime() {
    if (startTime) {
        totalTime += Date.now() - startTime;
        startTime = Date.now();
    }
    if (activeFolderPath) {
        const logPath = getLogFilePath(activeFolderPath);
        fs.writeFileSync(logPath, JSON.stringify({ totalTime, updated: new Date().toISOString() }, null, 2));
    }
}

function loadTime() {
    if (activeFolderPath) {
        const logPath = getLogFilePath(activeFolderPath);
        if (fs.existsSync(logPath)) {
            const data = JSON.parse(fs.readFileSync(logPath, 'utf8'));
            totalTime = data.totalTime || 0;
        }
    }
}

function getLogFilePath(folderPath: string) {
    const hash = crypto.createHash('md5').update(folderPath).digest('hex');
    return path.join(LOGS_DIR, `${hash}.json`);
}

function formatTime(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
}
