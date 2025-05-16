cmake_minimum_required(VERSION 3.10)

project(main)

# Use vcpkg toolchain if available
if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
    set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "Vcpkg toolchain file")
endif()

# Find packages with vcpkg
find_package(raylib CONFIG REQUIRED)
find_package(CURL CONFIG REQUIRED)
find_package(glfw3 CONFIG REQUIRED)

file(GLOB_RECURSE PROJECT_SOURCES CONFIGURE_DEPENDS "${CMAKE_CURRENT_LIST_DIR}/src/main.cpp" "${CMAKE_CURRENT_LIST_DIR}/src/lichess_bot.c" "${CMAKE_CURRENT_LIST_DIR}/src/uci_bot.c")

set(PROJECT_INCLUDE "${CMAKE_CURRENT_LIST_DIR}/src/")

add_executable(${PROJECT_NAME})

target_sources(${PROJECT_NAME} PRIVATE ${PROJECT_SOURCES})

target_include_directories(${PROJECT_NAME} PRIVATE ${PROJECT_INCLUDE})

target_link_libraries(${PROJECT_NAME} PRIVATE raylib CURL::libcurl glfw)
