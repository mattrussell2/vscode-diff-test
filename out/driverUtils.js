"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execShellCommand = exports.cleanup = exports.generateDriver = exports.getCwdUri = exports.getFileUri = exports.writeLocalFile = exports.getMakefileTarget = exports.getExecutableFileName = exports.getDriverFileName = exports.getDriverCppCleanUpOnBuild = exports.getCleanUpExecutableOnBuild = exports.getRunMakeCleanOnExit = exports.getValgrindTimeoutTime = exports.getTimeoutTime = exports.getRunWithValgrind = exports.getValgrindFlags = void 0;
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
function getCleanUpExecutableOnBuild() {
    return getBoolConfiguration('build')['cleanUpExecutableOnBuild'];
}
exports.getCleanUpExecutableOnBuild = getCleanUpExecutableOnBuild;
function getDriverCppCleanUpOnBuild() {
    return getConfiguration('build')['cleanUpDriverCppOnBuild'];
}
exports.getDriverCppCleanUpOnBuild = getDriverCppCleanUpOnBuild;
function getDriverFileName() {
    return getConfiguration('makefile')["driverFileName"];
}
exports.getDriverFileName = getDriverFileName;
function getExecutableFileName() {
    return getConfiguration('makefile')["executableFileName"];
}
exports.getExecutableFileName = getExecutableFileName;
function getMakefileTarget() {
    return getConfiguration('makefile')["targetName"];
}
exports.getMakefileTarget = getMakefileTarget;
// export function getUseExternC() : boolean {
//     return getBoolConfiguration('build')['useExternC'];
// }
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
const generateDriver = async function (queue) {
    // create driver file and auto-populate it
    let driverContents = `
    /*
    unit_test_driver.cpp
    Matt Russell
    COMP15 2020 Summer
    Updated 12/16/2020

    This file is used as the driver for unit testing.

    The 'tests' map will be auto-populated in the form:

        { "test_name", test_name }

    Where "test_name" maps to the associated test function in unit_tests.h.
    */

    #include <map>
    #include <string>
    #include <iostream>
    #include "unit_tests.h"

    typedef void (*FnPtr)();

    int main(int argc, char **argv) {

        /* will be filled in by the unit_test script */
        std::map<std::string, FnPtr> tests {

        };

        /* first argument to main() is the string of a test function name */
        if (argc <= 1) {
            std::cout << "No test function specified. Quitting" << std::endl;
            return 1;
        }

        /* extract the associated fn pointer from "tests", and run the test */
        FnPtr fn = tests[argv[1]];
        fn();

        return 0;
    }`.split("\n");
    let parentFiles = [];
    let testPairs = "";
    queue.forEach(item => {
        let name = item.data.getLabel();
        testPairs += `\t{ "` + name + `", ` + name + ` },\n`;
        let parentFile = item.test.id.split('/').filter(value => value.includes(".h"))[0];
        if (!parentFiles.includes(parentFile)) {
            parentFiles.push(parentFile);
        }
    });
    let insertLocation = -1;
    driverContents.forEach((line, index) => {
        if (line.includes(`#include "unit_tests.h"`)) {
            insertLocation = index;
        }
    });
    let firstPart = driverContents.slice(0, insertLocation).join("\n") + "\n";
    // if (getUseExternC()) {
    //     firstPart += 'extern \"C\" {\n';
    // }
    parentFiles.forEach(file => {
        firstPart += `    #include "` + file + `"\n`;
    });
    // if (getUseExternC()) {
    //     firstPart += '}\n';
    // }   
    let secondInsertLocation = -1;
    driverContents.forEach((line, index) => {
        if (line.includes("std::map<std::string, FnPtr> tests {")) {
            secondInsertLocation = index + 1;
        }
    });
    if (secondInsertLocation === -1) {
        return Promise.resolve(null);
    }
    firstPart += driverContents.slice(insertLocation + parentFiles.length, secondInsertLocation).join("\n");
    const secondPart = driverContents.slice(secondInsertLocation, driverContents.length).join("\n");
    const finalDriverContents = firstPart + testPairs + secondPart;
    return await exports.writeLocalFile(finalDriverContents, "unit_test_driver.cpp");
};
exports.generateDriver = generateDriver;
const cleanup = async function () {
    if (getDriverCppCleanUpOnBuild()) {
        vscode.workspace.fs.delete(getFileUri(getCwdUri(), "unit_test_driver.cpp"));
    }
    if (getCleanUpExecutableOnBuild()) {
        vscode.workspace.fs.delete(getFileUri(getCwdUri(), getExecutableFileName()));
    }
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