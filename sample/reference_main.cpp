#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {

    std::string line;
    while(std::cin >> line) {    
        std::cout << line << std::endl; // print whatever was sent via cin
    }

    // first arg to fn will be file to print to terminal
    if (argc > 1) {
        std::string   fname = argv[1];        

        std::ifstream myfile;
        myfile.open(fname);
        
        if (myfile.is_open()) {
            while (getline(myfile, line)) {
                std::cout << line << std::endl; // print the file's contents
            }
            myfile.close();
        } else {
            std::cout << "cannot open file" << std::endl;
        }
    }

    if (argc > 2) {
        std::ofstream myoutfile;
        myoutfile.open(argv[2]);
        myoutfile << "sending some data to file!" << std::endl; // send s to file
        myoutfile.close();
    }

    return 0;
}
