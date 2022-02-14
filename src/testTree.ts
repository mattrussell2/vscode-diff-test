import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { parseTestsFile } from './parser';
import { join } from 'path';
import { execShellCommand, getCwdUri, getExecutableFileName, 
         getTimeoutTime, getValgrindTimeoutTime, writeLocalFile, 
         getRunWithValgrind, getValgrindFlags } from './driverUtils';
import { existsSync, unlinkSync, readFileSync } from 'fs';

const textDecoder = new TextDecoder('utf-8');

export type TestData = TestFile | TestHeading | TestCase;

export const testData = new WeakMap<vscode.TestItem, TestData>();

let generationCounter = 0;

export const getContentFromFilesystem = async (uri: vscode.Uri) => {
    try {
        const rawContent = await vscode.workspace.fs.readFile(uri);
        return textDecoder.decode(rawContent);
    } catch (e) {
        console.warn(`Error providing tests for ${uri.fsPath}`, e);
        return '';
    }
};

export class TestFile {
    public didResolve = false;

    public async updateFromDisk(controller: vscode.TestController, item: vscode.TestItem) {
        try {
            // item is the unit_tests.h file -> content is the string of the file        
            const content = await getContentFromFilesystem(item.uri!);
            item.error = undefined;
            this.updateFromContents(controller, content, item);
        } catch (e) {
            item.error = e.stack;
        }
    }

    /**
    * Parses the tests from the input text, and updates the tests contained
    * by this file to be those from the text,
    */
    public updateFromContents(controller: vscode.TestController, 
                              content: string, 
                              item: vscode.TestItem) {
        const ancestors = [{ item, children: [] as vscode.TestItem[]}];
        console.log("ancestors", ancestors);

        const thisGeneration = generationCounter++;
        this.didResolve = true;

        const ascend = (depth: number) => {
            while (ancestors.length > depth) {
                const finished = ancestors.pop()!;
                console.log("ascending");
                console.log(finished.item);
                finished.item.children.replace(finished.children);
            }
        };
        parseTestsFile(content, {
            onTest: (range, name, testDict) => { 
                const parent = ancestors[ancestors.length - 1];
                const data = new TestCase(name, testDict, thisGeneration);
                const id = `${item.uri}/${data.getLabel()}`;        

                const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
                testData.set(tcase, data);
                tcase.range = range;
                parent.children.push(tcase);
            }
        });

        ascend(0); // finish and assign children for all remaining items
    }
}

export class TestHeading {
    constructor(public generation: number) {}
}

export class TestCase {
    constructor(
        private readonly name: String,  
        private testDict: any,     
        public generation: number,
        private passed?: boolean, 
        private input_args?: String[],
        private stdin_file?: String,
        private output_files?: String[],
        private run_valgrind?: boolean,
        private diff_stderr?: boolean,
    ) {
        this.passed       = false; 
        
        this.input_args   = testDict["input_args"]   ?? [];
        this.stdin_file   = testDict["stdin_file"]   ?? "";
        this.output_files = testDict["output_files"] ?? [];
        this.run_valgrind = testDict["run_valgrind"] ?? true;
        this.diff_stderr  = testDict["diff_stderr"]  ?? "";
    }

    getLabel() {
        return `${this.name}`;
    }
    
    private setFail(report: vscode.TestMessage, item: vscode.TestItem, opt: vscode.TestRun, duration: number) : void {                               
        report.location = new vscode.Location(item.uri!, item.range!);
        opt.failed(item, report, duration);
    }
    
    private reportFail(test: any, timeouttime: string,
                       item: vscode.TestItem, options: vscode.TestRun, duration: number) : void {
                        //report: string, item: vscode.TestItem, duration: number, options: vscode.TestRun) : void {        
        const stdoutHead = "stdout\n------\n";
        const stderrHead = "\nstderr\n------\n";

        let failMessage : string;
        if (test.exitcode === 143) { /* timed out */            
            failMessage = stdoutHead + test.stdout +
                          stderrHead + "test timed out - (took >" + timeouttime + " seconds)";                              
        }else {                                              
                failMessage = stdoutHead + test.stdout + stderrHead + test.stderr;
        }        
        this.setFail(new vscode.TestMessage(failMessage), item, options, duration);
    }

    async run(item: vscode.TestItem, options: vscode.TestRun) : Promise<void> {
        
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showInformationMessage('No folder or workspace opened');
            return;
        }
       
        const timeouttime  = getTimeoutTime().toString();
        const valgrindtime = getValgrindTimeoutTime().toString();               
        const execPath     = join(getCwdUri().fsPath, getExecutableFileName());      

        const start        = Date.now();    
        const result       = await execShellCommand(execPath + ' ' + this.name, {}, timeouttime);   
        let duration       = Date.now() - start;

        if (result.passed) {
            this.passed = true;

            // run the diff test, if a file to diff exists
            const diffFilePath = join(getCwdUri().fsPath, 'stdout/' + this.name);  
            if (existsSync(diffFilePath)) {
                const diffFile = readFileSync(diffFilePath).toString('utf-8');                    
                if (diffFile !== result.stdout) {                       
                    this.setFail(vscode.TestMessage.diff("diff failed!\n------------\n", result.stdout, diffFile),
                                 item, options, duration);
                    this.passed = false;
                }
            }

            // run the valgrind test, if user has set the option (is set to true by default)
            if (getRunWithValgrind()) {                                
                const valgrindResult = await execShellCommand('valgrind ' + getValgrindFlags() + ' --error-exitcode=1' +
                                                              ' ' + execPath + ' ' + this.name, {}, valgrindtime);                                
                duration = Date.now() - start;
                if (!valgrindResult.passed) {                                                 
                    this.reportFail(valgrindResult, valgrindtime, item, options, duration); 
                    this.passed = false;
                }
            }                                       
        }else {
            this.reportFail(result, timeouttime, item, options, duration);     
        }

        // possible that the 'main' test passed, but the valgrind/diff tests didn't.
        if (this.passed) {
            options.passed(item, duration);          
        }
    }
}