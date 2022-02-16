#include <fstream>
#include <iostream>
#include <string>

int main() {
    std::string line;
    while (std::cin >> line) {
        std::cout << line << std::endl;
        std::cout << "Hello world!" << std::endl;
    }
    return 0;
}
