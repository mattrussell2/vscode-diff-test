"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCase = exports.TestHeading = exports.TestFile = exports.getContentFromFilesystem = exports.testData = void 0;
const vscode = require("vscode");
const util_1 = require("util");
const parser_1 = require("./parser"); //, stdinDir 
const path_1 = require("path");
const driverUtils_1 = require("./driverUtils");
const fs_1 = require("fs");
const textDecoder = new util_1.TextDecoder('utf-8');
exports.testData = new WeakMap();
let generationCounter = 0;
const getContentFromFilesystem = async (uri) => {
    try {
        const rawContent = await vscode.workspace.fs.readFile(uri);
        return textDecoder.decode(rawContent);
    }
    catch (e) {
        console.warn(`Error providing tests for ${uri.fsPath}`, e);
        return '';
    }
};
exports.getContentFromFilesystem = getContentFromFilesystem;
class TestFile {
    constructor() {
        this.didResolve = false;
    }
    async updateFromDisk(controller, item) {
        try {
            // item is the unit_tests.h file -> content is the string of the file        
            const content = await exports.getContentFromFilesystem(item.uri);
            item.error = undefined;
            this.updateFromContents(controller, content, item);
        }
        catch (e) {
            item.error = e.stack;
        }
    }
    /**
    * Parses the tests from the input text, and updates the tests contained
    * by this file to be those from the text,
    */
    updateFromContents(controller, content, item) {
        const ancestors = [{ item, children: [] }];
        console.log("ancestors", ancestors);
        const thisGeneration = generationCounter++;
        this.didResolve = true;
        const ascend = (depth) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop();
                console.log("ascending");
                console.log(finished.item);
                finished.item.children.replace(finished.children);
            }
        };
        parser_1.parseTestsFile(content, {
            onTest: (range, name, testDict) => {
                const parent = ancestors[ancestors.length - 1];
                const data = new TestCase(name, testDict, thisGeneration);
                const id = `${item.uri}/${data.getLabel()}`;
                const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
                exports.testData.set(tcase, data);
                tcase.range = range;
                parent.children.push(tcase);
            }
        });
        ascend(0); // finish and assign children for all remaining items
    }
}
exports.TestFile = TestFile;
class TestHeading {
    constructor(generation) {
        this.generation = generation;
    }
}
exports.TestHeading = TestHeading;
class TestCase {
    constructor(name, testDict, generation, passed, argv, stdin_file, output_files) {
        var _a, _b, _c;
        this.name = name;
        this.testDict = testDict;
        this.generation = generation;
        this.passed = passed;
        this.argv = argv;
        this.stdin_file = stdin_file;
        this.output_files = output_files;
        this.passed = false;
        this.argv = (_a = testDict["argv"]) !== null && _a !== void 0 ? _a : [];
        this.stdin_file = (_b = testDict["stdin_file"]) !== null && _b !== void 0 ? _b : "";
        this.output_files = (_c = testDict["created_files"]) !== null && _c !== void 0 ? _c : [];
        //this.run_valgrind = testDict["run_valgrind"] ?? true;
        //this.diff_stderr  = testDict["diff_stderr"]  ?? "";
    }
    getLabel() {
        return `${this.name}`;
    }
    setFail(report, item, opt, duration) {
        report.location = new vscode.Location(item.uri, item.range);
        opt.failed(item, report, duration);
    }
    reportFail(test, timeouttime, item, options, duration) {
        //report: string, item: vscode.TestItem, duration: number, options: vscode.TestRun) : void {        
        const stdoutHead = "stdout\n------\n";
        const stderrHead = "\nstderr\n------\n";
        let failMessage;
        if (test.exitcode === 143) { /* timed out */
            failMessage = stdoutHead + test.stdout +
                stderrHead + "test timed out - (took >" + timeouttime + " seconds)";
        }
        else {
            failMessage = stdoutHead + test.stdout + stderrHead + test.stderr;
        }
        this.setFail(new vscode.TestMessage(failMessage), item, options, duration);
    }
    getOutputFiles() {
        var _a;
        var outfiles = [];
        for (let output_file of (_a = this.output_files) !== null && _a !== void 0 ? _a : []) {
            const outfpath = path_1.join(driverUtils_1.getCwdUri().fsPath, output_file);
            if (!fs_1.existsSync(outfpath)) {
                outfiles.push("");
            }
            else {
                outfiles.push(fs_1.readFileSync(outfpath).toString('utf-8'));
                fs_1.unlinkSync(outfpath);
            }
        }
        console.log(outfiles);
        return outfiles;
    }
    async run(item, options) {
        var _a, _b;
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showInformationMessage('No folder or workspace opened');
            return;
        }
        const timeouttime = driverUtils_1.getTimeoutTime().toString();
        const valgrindtime = driverUtils_1.getValgrindTimeoutTime().toString();
        const execPath = path_1.join(driverUtils_1.getCwdUri().fsPath, parser_1.executableFileName);
        const refPath = path_1.join(driverUtils_1.getCwdUri().fsPath, parser_1.referenceExecutable);
        const stdinPath = path_1.join(driverUtils_1.getCwdUri().fsPath); //, stdinDir);        
        const stdinFile = (_a = this.stdin_file) !== null && _a !== void 0 ? _a : "";
        console.log(execPath);
        const start = Date.now();
        // ADD INPUT ARGS TO EXEC        
        var appendArgs = " ";
        for (let arg of (_b = this.argv) !== null && _b !== void 0 ? _b : []) {
            appendArgs += path_1.join(driverUtils_1.getCwdUri().fsPath, arg) + " ";
        }
        appendArgs += " < " + path_1.join(stdinPath, stdinFile);
        const result = await driverUtils_1.execShellCommand(execPath + appendArgs, {}, timeouttime);
        const studOutfiles = this.getOutputFiles();
        // ordering is important - get student output files before reference overwrites them.
        const refResult = await driverUtils_1.execShellCommand(refPath + appendArgs, {}, timeouttime);
        const refOutfiles = this.getOutputFiles();
        let duration = Date.now() - start;
        if (result.passed) {
            this.passed = true;
            if (result.stdout !== refResult.stdout) {
                this.setFail(vscode.TestMessage.diff("stdout diff failed\n", refResult.stdout, result.stdout), item, options, duration);
                this.passed = false;
            }
            else if (result.stderr !== refResult.stderr) {
                this.setFail(vscode.TestMessage.diff("stderr diff failed\n", refResult.stderr, result.stderr), item, options, duration);
                this.passed = false;
            }
            else if (this.output_files) {
                console.log(this.output_files);
                for (let i = 0; i < this.output_files.length; i++) {
                    if (studOutfiles[i] !== refOutfiles[i]) {
                        this.setFail(vscode.TestMessage.diff("output file mismatch: " +
                            this.output_files[i] + '\n', refOutfiles[i], studOutfiles[i]), item, options, duration);
                        this.passed = false;
                    }
                }
            }
            // run the valgrind test, if user has set the option (is set to true by default)
            else if (driverUtils_1.getRunWithValgrind()) {
                const valgrindResult = await driverUtils_1.execShellCommand('valgrind ' + driverUtils_1.getValgrindFlags() +
                    ' --error-exitcode=1' + ' ' +
                    execPath + appendArgs, {}, valgrindtime);
                duration = Date.now() - start;
                if (!valgrindResult.passed) {
                    this.reportFail(valgrindResult, valgrindtime, item, options, duration);
                    this.passed = false;
                }
            }
        }
        else {
            this.reportFail(result, timeouttime, item, options, duration);
        }
        // possible that the 'main' test passed, but the valgrind/diff tests didn't.
        if (this.passed) {
            options.passed(item, duration);
        }
    }
}
exports.TestCase = TestCase;
//# sourceMappingURL=testTree.js.map