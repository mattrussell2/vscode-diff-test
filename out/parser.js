"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTestsFile = void 0;
const vscode = require("vscode");
const toml = require("toml");
const testLineRe = /^\s*\[tests\..*\]\s*/;
const configArgs = ["exec", "ref_exec", "build_target", "stdin_dir"];
const testArgs = ["input_args", "stdin_file", "output_files", "run_valgrind", "diff_stderr"];
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
    //     input_args   = ["infiles/file1", "somearg"] # ./MetroSim infiles/file1 somearg     (default=[])
    // stdin_file   = "test1"              # MetroSim ... < test1        (default=None)
    // output_files = ["somearg"]          # 'somearg' is written to by the program.
    // run_valgrind = "True"               # [optional] run valgrind?    (default=True)
    // diff_stderr  = "False"              # [optional] diff stderr with the reference?
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