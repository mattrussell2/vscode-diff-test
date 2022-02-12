#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    
    std::string s;
    std::cin >> s;

    // our program incorrectly prints "hello world", rather than what
    // was sent from cin
    std::cout << "hello world!" << std::endl;

    if (argc > 1) {
        std::string   fname = argv[1];
        std::ifstream myfile;
        myfile.open(fname);

        // our program incorrectly prints "hello world" again, rather than what
        // was was in the file
        std::cout << "hello again!" << std::endl;

        myfile.close();
    }

    // our program incorrectly sends "hello world!" to file
    if (argc > 2) {
        std::ofstream myoutfile;
        myoutfile.open(argv[2]);
        myoutfile << "hello world!" << std::endl; 
        myoutfile.close();
    }
    return 0;
}
