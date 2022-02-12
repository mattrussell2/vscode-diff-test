"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execShellCommand = exports.cleanup = exports.getCwdUri = exports.getFileUri = exports.writeLocalFile = exports.getExecutableFileName = exports.getMakefileTarget = exports.getRunMakeCleanOnExit = exports.getValgrindTimeoutTime = exports.getTimeoutTime = exports.getRunWithValgrind = exports.getValgrindFlags = void 0;
const vscode = require("vscode");
const util_1 = require("util");
const path_1 = require("path");
const process_1 = require("process");
function getConfiguration(configtype) {
    const uTestConfig = vscode.workspace.getConfiguration('cpp-unit-test');
    const config = uTestConfig.get(configtype);
    if (config === undefined) {
        console.log("NEED TO DEFINE " + configtype + " CONFIG");
        process_1.exit(1);
    }
    return config;
}
function getBoolConfiguration(configtype) {
    const uTestConfig = vscode.workspace.getConfiguration('cpp-unit-test');
    const config = uTestConfig.get(configtype);
    if (config === undefined) {
        console.log("NEED TO DEFINE " + configtype + " CONFIG");
        process_1.exit(1);
    }
    return config;
}
function getValgrindFlags() {
    return getConfiguration('valgrind')['valgrindFlags'];
}
exports.getValgrindFlags = getValgrindFlags;
function getRunWithValgrind() {
    return getBoolConfiguration('valgrind')['runWithValgrind'];
}
exports.getRunWithValgrind = getRunWithValgrind;
function getTimeoutTime() {
    return getConfiguration('run')['timeoutTime'];
}
exports.getTimeoutTime = getTimeoutTime;
function getValgrindTimeoutTime() {
    return getConfiguration('run')['valgrindTimeoutTime'];
}
exports.getValgrindTimeoutTime = getValgrindTimeoutTime;
function getRunMakeCleanOnExit() {
    return getBoolConfiguration('build')['runMakeCleanOnExit'];
}
exports.getRunMakeCleanOnExit = getRunMakeCleanOnExit;
function getMakefileTarget() {
    return "";
}
exports.getMakefileTarget = getMakefileTarget;
function getExecutableFileName() {
    return "a.out";
}
exports.getExecutableFileName = getExecutableFileName;
const writeLocalFile = async function (filecontents, fName) {
    const fileUri = getFileUri(getCwdUri(), fName);
    var enc = new util_1.TextEncoder();
    var encodedDriverContents = enc.encode(filecontents);
    return await vscode.workspace.fs.writeFile(fileUri, encodedDriverContents);
};
exports.writeLocalFile = writeLocalFile;
function getFileUri(folderUri, fName) {
    return folderUri.with({ path: path_1.posix.join(folderUri.path, fName) });
}
exports.getFileUri = getFileUri;
function getCwdUri() {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showInformationMessage('No folder or workspace opened!');
        process_1.exit(1);
    }
    return vscode.workspace.workspaceFolders[0].uri;
}
exports.getCwdUri = getCwdUri;
const cleanup = async function () {
    if (getRunMakeCleanOnExit()) {
        await exports.execShellCommand("make clean");
    }
};
exports.cleanup = cleanup;
const execShellCommand = async function (cmd, fsPathDict = {}, timeout) {
    const exec = require('child_process').exec;
    console.log(timeout);
    if (timeout) {
        console.log("HERE");
        cmd = "timeout --preserve-status " + timeout + " " + cmd;
    }
    console.log(cmd);
    return new Promise((resolve, reject) => {
        exec(cmd, fsPathDict, (error, stdout, stderr) => {
            let result = { 'passed': false, 'stdout': "", 'stderr': "", 'exitcode': "" };
            if (error) {
                result.passed = false;
                if (error.code) {
                    result.exitcode = error.code;
                    console.log("exitcode: " + result.exitcode);
                }
            }
            else {
                result.passed = true;
                result.exitcode = '0';
            }
            result.stdout = stdout;
            result.stderr = stderr;
            resolve(result);
        });
    });
};
exports.execShellCommand = execShellCommand;
//# sourceMappingURL=driverUtils.js.map