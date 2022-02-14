#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    
    std::string line;
    while(std::cin >> line) {    
        std::cout << "Hello world!" << std::endl;
        //std::cout << line << std::endl; // print whatever was sent via cin
    }
    
    if (argc > 1) {
        std::string   fname = argv[1];
        std::ifstream myfile;
        myfile.open(fname);

        // our program incorrectly prints "hello world" again, rather than what
        // was was in the file       
        if (myfile.is_open()) {
            std::cout << "hello again!" << std::endl;
            // while (getline(myfile, line)) {
            //     std::cout << line << std::endl; // print the file's contents
            // }
            myfile.close();
        } else {
            std::cout << "cannot open file" << std::endl; 
        }       
    }

    // our program incorrectly sends "hello world!" to file
    if (argc > 2) {
        std::ofstream myoutfile;
        myoutfile.open(argv[2]);
        myoutfile << "hello world!" << std::endl; 
        //myoutfile << "sending some data to file!" << std::endl;
        myoutfile.close();
    }
    return 0;
}
