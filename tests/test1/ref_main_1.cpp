#include <iostream>
#include <string>

int main(int argc, char** argv) {

    std::string line;
    while (std::cin >> line) {
        std::cout << line << std::endl;
    }
    return 0;
}
