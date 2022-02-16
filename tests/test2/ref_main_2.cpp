#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {

    // first arg to fn will be file to print to terminal
    if (argc > 1) {
        std::string   line;
        std::string   fname = argv[1];
        std::ifstream myfile;
        myfile.open(fname);

        if (myfile.is_open()) {
            while (getline(myfile, line)) {
                std::cout << line << std::endl;
            }
            myfile.close();
        } else {
            std::cout << "cannot open file\n";
        }
    } else {
        std::cout << "please provide input file\n";
    }
    return 0;
}
