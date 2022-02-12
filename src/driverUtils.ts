import * as vscode from 'vscode';
import { TextEncoder } from 'util';
import { posix } from 'path';
import { TestCase } from './testTree';
import { exit } from 'process';

function getConfiguration(configtype : string) : {[key : string] : string}  {
    const uTestConfig = vscode.workspace.getConfiguration('cpp-unit-test');
    const config : {[key : string] : string} | undefined = uTestConfig.get(configtype);
    if (config === undefined) { console.log("NEED TO DEFINE " + configtype + " CONFIG"); exit(1); }
    return config; 
}

function getBoolConfiguration(configtype : string) : {[key : string] : boolean}  {
    const uTestConfig = vscode.workspace.getConfiguration('cpp-unit-test');
    const config : {[key : string] : boolean} | undefined = uTestConfig.get(configtype);
    if (config === undefined) { console.log("NEED TO DEFINE " + configtype + " CONFIG"); exit(1); }
    return config; 
}

export function getValgrindFlags() : string {
    return getConfiguration('valgrind')['valgrindFlags'];
}

export function getRunWithValgrind() : boolean {
    return getBoolConfiguration('valgrind')['runWithValgrind'];         
}

export function getTimeoutTime() : string {
    return getConfiguration('run')['timeoutTime'];
}

export function getValgrindTimeoutTime() : string {
    return getConfiguration('run')['valgrindTimeoutTime'];
}

export function getRunMakeCleanOnExit() : boolean {
    return getBoolConfiguration('build')['runMakeCleanOnExit'];    
}

export function getMakefileTarget() : string {
    return "";
}

export function getExecutableFileName() : string {
    return "a.out"
}

export const writeLocalFile = async function(filecontents:string, fName:string) {   
    const fileUri = getFileUri(getCwdUri(), fName);
    var enc = new TextEncoder();
    var encodedDriverContents = enc.encode(filecontents);
    return await vscode.workspace.fs.writeFile(fileUri, encodedDriverContents);                
};

export function getFileUri(folderUri:vscode.Uri, fName:string) {
    return folderUri.with({ path: posix.join(folderUri.path, fName) });
}

export function getCwdUri() {
    if (!vscode.workspace.workspaceFolders) {
        vscode.window.showInformationMessage('No folder or workspace opened!');
        exit(1);        
    } 
    return vscode.workspace.workspaceFolders[0].uri;
}


export const cleanup = async function() {           
    if (getRunMakeCleanOnExit()) {
        await execShellCommand("make clean");
    }
};


export const execShellCommand =
 async function(cmd: string, fsPathDict: Object={}, timeout?:string) : Promise<any> {
    
    const exec = require('child_process').exec;
    
    console.log(timeout);
    if (timeout) {
        console.log("HERE");
        cmd = "timeout --preserve-status " + timeout + " " + cmd;
    }
    console.log(cmd);

    return new Promise((resolve, reject) => {
        exec(cmd, 
             fsPathDict, 
             (error:NodeJS.ErrnoException, stdout:string, stderr:string) => {
        
        let result = {'passed': false, 'stdout':"", 'stderr':"", 'exitcode':""};      
        if (error) {
            result.passed = false;
            if (error.code){
                result.exitcode = error.code;
                console.log("exitcode: " + result.exitcode);
            } 
        }else{
            result.passed = true;
            result.exitcode = '0';
        }
                
        result.stdout = stdout;
        result.stderr = stderr;
        resolve(result);     
        });
    });
};
