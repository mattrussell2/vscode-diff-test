#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
    std::ofstream myoutfile;
    myoutfile.open("./myoutputfile");
    myoutfile << "5\n4\n3\n2\n1\n" << std::endl;
    myoutfile.close();

    return 0;
}