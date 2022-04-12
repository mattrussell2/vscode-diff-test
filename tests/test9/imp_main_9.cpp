// #include <iostream>
// #include <fstream>

// int main(int argc, char** argv) {
//     std::ofstream out; 
//     out.open("myoutput");
//     out << "1\n2\n3\n4\n5\n";
//     out.close();
//     // std::cout << "1\n2\n3\n4\n5\n";
//     // std::cerr << "1\n2\n3\n4\n5\n";
//     return 0;
// }

#include <fstream>
#include <iostream>
#include <string>

int main(int argc, char** argv) {
  
    std::ofstream myoutfile;
    myoutfile.open("./myoutputfile");
    myoutfile << "1\n2\n3\n4\n" << std::endl;
    myoutfile.close();

    return 0;
}
