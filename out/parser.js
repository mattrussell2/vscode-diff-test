"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestsFile = exports.buildTarget = exports.referenceExecutable = exports.executableFileName = void 0;
const vscode = require("vscode");
const toml = require("toml");
const testLineRe = /^\s*\[tests\..*\]\s*/;
const configArgs = ["exec", "ref_exec", "build_target"]; //, "stdin_dir"];
const testArgs = ["argv", "stdin_file", "created_files"]; //, "run_valgrind", "diff_stderr"];
exports.executableFileName = "";
exports.referenceExecutable = "";
exports.buildTarget = "";
//export var stdinDir            = "";
const parseTestsFile = (text, events) => {
    const data = toml.parse(text);
    const sections = Object.keys(data);
    if (!sections.includes("config")) {
        vscode.window.showErrorMessage("Error: missing [config] section");
    }
    for (let arg of configArgs) {
        if (!(arg in data["config"])) {
            vscode.window.showErrorMessage("Error: missing [config] variable: " + arg);
        }
    }
    exports.executableFileName = data["config"]["exec"];
    exports.referenceExecutable = data["config"]["ref_exec"];
    exports.buildTarget = data["config"]["build_target"];
    //stdinDir            = data["config"]["stdin_dir"];        
    for (let arg of Object.keys(data["config"])) {
        if (!configArgs.includes(arg)) {
            vscode.window.showWarningMessage("Warning: unknown [config] variable: " + arg);
        }
    }
    if (!sections.includes("tests")) {
        vscode.window.showErrorMessage("Error: missing section [tests.testname]");
    }
    for (let test of Object.keys(data["tests"])) {
        for (let arg of Object.keys(data["tests"][test])) {
            if (!testArgs.includes(arg)) {
                vscode.window.showWarningMessage("Warning: unknown variable in [tests." + test + "]: " + arg);
            }
        }
    }
    // parse the lines of the file and add the test indicators.
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; lineNo++) {
        const line = lines[lineNo];
        const test = testLineRe.exec(line);
        if (test) {
            const tMatch = test[0].trim();
            const name = tMatch.slice(7, -1); // [test.abcd] => abcd
            const range = new vscode.Range(new vscode.Position(lineNo, 0), new vscode.Position(lineNo, test[0].length));
            events.onTest(range, name, data['tests'][name]);
        }
    }
};
exports.parseTestsFile = parseTestsFile;
//# sourceMappingURL=parser.js.map