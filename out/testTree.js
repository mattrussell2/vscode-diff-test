"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCase = exports.TestHeading = exports.TestFile = exports.getContentFromFilesystem = exports.testData = void 0;
const vscode = require("vscode");
const util_1 = require("util");
const parser_1 = require("./parser");
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
            onTest: (range, name) => {
                console.log("parsing tests file -- name: ", name);
                const parent = ancestors[ancestors.length - 1];
                const data = new TestCase(name, thisGeneration);
                const id = `${item.uri}/${data.getLabel()}`;
                const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
                exports.testData.set(tcase, data);
                tcase.range = range;
                parent.children.push(tcase);
            },
            onHeading: (range, name, depth) => {
                ascend(depth);
                const parent = ancestors[ancestors.length - 1];
                const id = `${item.uri}/${name}`;
                const thead = controller.createTestItem(id, name, item.uri);
                thead.range = range;
                exports.testData.set(thead, new TestHeading(thisGeneration));
                parent.children.push(thead);
                ancestors.push({ item: thead, children: [] });
            },
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
    constructor(name, generation, passed) {
        this.name = name;
        this.generation = generation;
        this.passed = passed;
        this.passed = false;
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
    async run(item, options) {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showInformationMessage('No folder or workspace opened');
            return;
        }
        const timeouttime = driverUtils_1.getTimeoutTime().toString();
        const valgrindtime = driverUtils_1.getValgrindTimeoutTime().toString();
        const execPath = path_1.join(driverUtils_1.getCwdUri().fsPath, driverUtils_1.getExecutableFileName());
        const start = Date.now();
        const result = await driverUtils_1.execShellCommand(execPath + ' ' + this.name, {}, timeouttime);
        let duration = Date.now() - start;
        if (result.passed) {
            this.passed = true;
            // run the diff test, if a file to diff exists
            const diffFilePath = path_1.join(driverUtils_1.getCwdUri().fsPath, 'stdout/' + this.name);
            if (fs_1.existsSync(diffFilePath)) {
                const diffFile = fs_1.readFileSync(diffFilePath).toString('utf-8');
                if (diffFile !== result.stdout) {
                    this.setFail(vscode.TestMessage.diff("diff failed!\n------------\n", result.stdout, diffFile), item, options, duration);
                    this.passed = false;
                }
            }
            // run the valgrind test, if user has set the option (is set to true by default)
            if (driverUtils_1.getRunWithValgrind()) {
                const valgrindResult = await driverUtils_1.execShellCommand('valgrind ' + driverUtils_1.getValgrindFlags() + ' --error-exitcode=1' +
                    ' ' + execPath + ' ' + this.name, {}, valgrindtime);
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