#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {

    std::string s;
    std::cin >> s;

    // print the contents of whatever was sent via cin
    std::cout << s << std::endl;
    if (argc > 1) {
        std::string   fname = argv[1];
        std::ifstream myfile;
        myfile.open(fname);

        std::string line;
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
        myoutfile << s << std::endl; // send s to file
        myoutfile.close();
    }

    return 0;
}
