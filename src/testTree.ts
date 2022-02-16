import * as vscode from 'vscode';
import { TextDecoder } from 'util';
import { referenceExecutable, executableFileName, 
         parseTestsFile, buildTarget} from './parser'; //, stdinDir 
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
        private argv?: string[],
        private stdin_file?: string,
        private output_files?: string[],
        //private run_valgrind?: boolean,
        //private diff_stderr?: boolean,
    ) {
        this.passed       = false; 
        
        this.argv         = testDict["argv"]         ?? [];
        this.stdin_file   = testDict["stdin_file"]   ?? "";
        this.output_files = testDict["created_files"] ?? [];
        //this.run_valgrind = testDict["run_valgrind"] ?? true;
        //this.diff_stderr  = testDict["diff_stderr"]  ?? "";
    }

    getLabel() {
        return `${this.name}`;
    }
    
    private setFail(report: vscode.TestMessage, item: vscode.TestItem, 
                    opt: vscode.TestRun, duration: number) : void {                               
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

    private getOutputFiles() : string[]{
        var outfiles:string[] = [];
        for (let output_file of this.output_files ?? []) {            
            const outfpath = join(getCwdUri().fsPath, output_file);
            if (!existsSync(outfpath)) {
                outfiles.push("");
            }else{
                outfiles.push(readFileSync(outfpath).toString('utf-8'));
                unlinkSync(outfpath);
            }                
        }
        console.log(outfiles);
        return outfiles;
    }

    async run(item: vscode.TestItem, options: vscode.TestRun) : Promise<void> {
        
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showInformationMessage('No folder or workspace opened');
            return;
        }
       
        const timeouttime  = getTimeoutTime().toString();
        const valgrindtime = getValgrindTimeoutTime().toString();               
                
        const execPath     = join(getCwdUri().fsPath, executableFileName); 
        const refPath      = join(getCwdUri().fsPath, referenceExecutable);        
        const stdinPath    = join(getCwdUri().fsPath); //, stdinDir);        
        const stdinFile    = this.stdin_file ?? "";

        console.log(execPath);

        const start        = Date.now();    

        // ADD INPUT ARGS TO EXEC        
        var appendArgs:string = " ";
        for (let arg of this.argv ?? []) {
            appendArgs += join(getCwdUri().fsPath, arg) + " ";
        }
        appendArgs += " < " + join(stdinPath, stdinFile);
        
        const result       = await execShellCommand(execPath + appendArgs, {}, timeouttime);           
        const studOutfiles = this.getOutputFiles();        
        
        // ordering is important - get student output files before reference overwrites them.
        const refResult    = await execShellCommand(refPath  + appendArgs, {}, timeouttime);        
        const refOutfiles  = this.getOutputFiles();
        
        let duration = Date.now() - start;

        if (result.passed) {
            this.passed = true;

            if (result.stdout !== refResult.stdout) {                
                this.setFail(vscode.TestMessage.diff("stdout diff failed\n",
                                                      refResult.stdout,
                                                      result.stdout),
                             item, options, duration);
                this.passed = false;            
            }

            if (this.passed && result.stderr !== refResult.stderr) {                
                this.setFail(vscode.TestMessage.diff("stderr diff failed\n", 
                                                     refResult.stderr, result.stderr),
                             item, options, duration);
                this.passed = false;            
            }
            
            if (this.passed && this.output_files) {
                console.log(this.output_files);
                for (let i = 0; i < this.output_files.length; i++) {
                    if (studOutfiles[i] !== refOutfiles[i]) {
                        this.setFail(vscode.TestMessage.diff("output file mismatch: " + 
                                                            this.output_files[i] + '\n', 
                                                            refOutfiles[i], studOutfiles[i]),
                                    item, options, duration);
                        this.passed = false;
                    }                    
                }
            }

            // run the valgrind test, if user has set the option (is set to true by default)
            if (this.passed && getRunWithValgrind()) {    
                                           
                const valgrindResult = await execShellCommand('valgrind ' + getValgrindFlags() +
                                                              ' --error-exitcode=1' + ' ' +
                                                               execPath + appendArgs, 
                                                               {},
                                                               valgrindtime);                                
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