#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    if (argc > 1) {
        std::ofstream myoutfile;
        myoutfile.open(argv[1]);
        myoutfile << "sending some data to file!" << std::endl;
        myoutfile.close();
    }
    return 0;
}