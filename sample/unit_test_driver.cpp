
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
        std::map<std::string, FnPtr> tests {	{ "test_pass", test_pass },
	{ "test_pass_1", test_pass_1 },
	{ "test_fail", test_fail },
	{ "test_fail_valgrind", test_fail_valgrind },
	{ "diff_test_pass", diff_test_pass },
	{ "diff_test_fail", diff_test_fail },
	{ "comment_after_line", comment_after_line },
	{ "name_in_comment", name_in_comment },
	{ "name_in_inline_comment", name_in_inline_comment },
	{ "timeout_test", timeout_test },

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
    }