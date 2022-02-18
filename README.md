# vscode-diff-test
A simple and sweet VSCode extension run diff tests.

# Getting started
If you haven't already, [install the Unit Testing Framework by AutumnMoon from the VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=AutumnMoon.diff-test). 

You can find the starter code in the source repo: 

```
git clone https://www.github.com/mattrussell2/vscode-diff-test
cd vscode-diff-test/sample
```

Wonderful! Now, open this folder in a new workspace:

```code .```

Note! The extension requires a `.toml` file in your workspace in order to activate. If so, you should see the testing image on the left-hand panel. Otherwise, make sure to have a `.toml` file in your directory, and reload the workspace.

![image](./images/left-hand-side.png)

# testing .toml file
In order to run tests, you need a `.toml` file [see here for details](https://github.com/toml-lang/toml) with two main sections: `[config]`, and `[tests]`.

## [config]
The `[config]` section must contain the following required arguments: 
```
[config]
exec         = "a.out"     # path of the executable file to run
ref_exec     = "ref_a.out" # path of referece executable
build_target = "build"     # command to 'make' -> here, `make build` will be run
```
## [tests]
The `[tests]` section must contain one sub-section per test as follows: 
```
[tests.my_first_test]
...
[tests.my_second_test]
```
All arguments for a given test are optional. The arguments are:
```
[test.example_test]
argv          = ["arg1", "arg2"...] # list of arguments to your program
stdin_file    = 'my_stdin_file'     # a file to send to your program's stdin
created_files = ["my_outfile",...]  # a list of files created by your program. 
```
For the above test and configuration, the command-line code is equivalent: 
```./a.out arg1 arg2 < my_stdin_file ```

## Execution of a test
Press the play button to run a test. On running a test, the proper argv and stdin_file will be run with both your program, and the reference program. 

Afterwards, your stdout/stderr, and any created files will be diff'd against the reference. 

Valgrind will also be run on your code by default - memory leaks / errors will fail the test. Likewise, segfaulting, etc. will fail your test by default.

## Conclusion
That's it! Happy testing.

Matt

PS: Many thanks to [https://github.com/microsoft/vscode-extension-samples](https://github.com/microsoft/vscode-extension-samples) for having some great examples to work from.
