"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const testTree_1 = require("./testTree");
const driverUtils_1 = require("./driverUtils");
const parser_1 = require("./parser");
const process_1 = require("process");
async function activate(context) {
    const ctrl = vscode.tests.createTestController('TestController', 'Test');
    context.subscriptions.push(ctrl);
    const runHandler = (request, cancellation) => {
        var _a;
        const queue = [];
        const run = ctrl.createTestRun(request);
        // map of file uris -> statments on each line:
        const discoverTests = async (tests) => {
            var _a;
            for (const test of tests) {
                if ((_a = request.exclude) === null || _a === void 0 ? void 0 : _a.includes(test)) {
                    continue;
                }
                const data = testTree_1.testData.get(test);
                if (data instanceof testTree_1.TestCase) {
                    run.enqueued(test);
                    queue.push({ test, data });
                }
                else {
                    if (data instanceof testTree_1.TestFile && !data.didResolve) {
                        await data.updateFromDisk(ctrl, test);
                    }
                    await discoverTests(gatherTestItems(test.children));
                }
            }
        };
        const runTestQueue = async () => {
            const made = await driverUtils_1.execShellCommand('make ' + parser_1.buildTarget, { cwd: driverUtils_1.getCwdUri().fsPath });
            if (!made.passed) {
                run.appendOutput(`Compilation Failed\r\n`);
                const data = new testTree_1.TestCase("compilation", {}, 0);
                const id = `${queue[0].test.uri}/${"data.getLabel()"}`;
                const tcase = ctrl.createTestItem(id, data.getLabel(), queue[0].test.uri);
                testTree_1.testData.set(tcase, data);
                run.started(tcase);
                let message = new vscode.TestMessage(made.stderr);
                message.location = new vscode.Location(queue[0].test.uri, queue[0].test.range);
                run.failed(queue[0].test, message, 0);
                run.end();
                process_1.exit(1);
            }
            for (const { test, data } of queue) {
                run.appendOutput(`Running ${test.id}\r\n`);
                if (cancellation.isCancellationRequested) {
                    run.skipped(test);
                }
                else {
                    run.started(test);
                    await data.run(test, run);
                }
                run.appendOutput(`Completed ${test.id}\r\n`);
            }
            run.end();
            await driverUtils_1.cleanup();
        };
        discoverTests((_a = request.include) !== null && _a !== void 0 ? _a : gatherTestItems(ctrl.items)).then(runTestQueue);
    };
    ctrl.createRunProfile('Run Tests', vscode.TestRunProfileKind.Run, runHandler, true);
    ctrl.resolveHandler = async (item) => {
        if (!item) {
            context.subscriptions.push(...startWatchingWorkspace(ctrl));
            return;
        }
        const data = testTree_1.testData.get(item);
        if (data instanceof testTree_1.TestFile) {
            await data.updateFromDisk(ctrl, item);
        }
    };
    function updateNodeForDocument(e) {
        if (e.uri.scheme !== 'file' || !e.uri.path.includes('.toml')) {
            return;
        }
        const { file, data } = getOrCreateFile(ctrl, e.uri);
        data.updateFromContents(ctrl, e.getText(), file);
    }
    for (const document of vscode.workspace.textDocuments) {
        updateNodeForDocument(document);
    }
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(updateNodeForDocument), vscode.workspace.onDidChangeTextDocument(e => updateNodeForDocument(e.document)));
}
exports.activate = activate;
function getOrCreateFile(controller, uri) {
    const existing = controller.items.get(uri.toString());
    if (existing) {
        return { file: existing, data: testTree_1.testData.get(existing) };
    }
    const file = controller.createTestItem(uri.toString(), uri.path.split('/').pop(), uri);
    controller.items.add(file);
    const data = new testTree_1.TestFile();
    testTree_1.testData.set(file, data);
    file.canResolveChildren = true;
    return { file, data };
}
function gatherTestItems(collection) {
    const items = [];
    collection.forEach(item => items.push(item));
    return items;
}
function startWatchingWorkspace(controller) {
    if (!vscode.workspace.workspaceFolders) {
        return [];
    }
    return vscode.workspace.workspaceFolders.map(workspaceFolder => {
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.toml');
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        watcher.onDidCreate(uri => getOrCreateFile(controller, uri));
        watcher.onDidChange(uri => {
            const { file, data } = getOrCreateFile(controller, uri);
            if (data.didResolve) {
                data.updateFromDisk(controller, file);
            }
        });
        watcher.onDidDelete(uri => controller.items.delete(uri.toString()));
        return watcher;
    });
}
//# sourceMappingURL=extension.js.map