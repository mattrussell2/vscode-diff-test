#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    if (argc > 1) {
        std::string   line;
        std::string   fname = argv[1];
        std::ifstream myfile;
        myfile.open(fname);

        if (myfile.is_open()) {
            std::cout << "hello again!\n";
            while (getline(myfile, line)) {
                std::cout << line << std::endl; // print the file's contents
            }
            myfile.close();
        } else {
            std::cout << "cannot open file\n";
        }
    } else {
        std::cout << "this is the wrong error message\n";
    }
    return 0;
}
