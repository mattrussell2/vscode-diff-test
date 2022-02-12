CXX = clang++

build: main.o
	$(CXX) main.o -o run

main.o: main.cpp
	$(CXX) -c main.cpp


# this is for building reference
# (for hws, we do this part for you)
reference: reference_main.o
	$(CXX) reference_main.o -o reference

reference.o: reference_main.cpp
	$(CXX) -c reference_main.cpp
