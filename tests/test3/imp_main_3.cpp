#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    if (argc > 1) {
        std::ofstream myoutfile;
        myoutfile.open(argv[1]);
        myoutfile << "sending the wrong data to a file!" << std::endl;
        myoutfile.close();
    } else {
        std::cout << "please provide the filename" << std::endl;
    }
    return 0;
}
