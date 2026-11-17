cmake_minimum_required(VERSION 3.20)

project(mogo_backend VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(MOGO_FEATURE_PERSONAL_FINANCE "Build the personal finance feature" ON)
option(MOGO_FEATURE_USER_PROFILE "Build the local user profile feature" ON)
option(MOGO_ENABLE_HTTP "Build the libhv HTTP adapter" ON)
option(MOGO_BUILD_TESTS "Build backend tests" ON)

include(cmake/Dependencies.cmake)

add_library(mogo_core_shared INTERFACE)
target_include_directories(mogo_core_shared INTERFACE core_shared/include)

if(MOGO_FEATURE_PERSONAL_FINANCE)
  add_subdirectory(features/personal_finance)
endif()

if(MOGO_FEATURE_USER_PROFILE)
  add_subdirectory(features/user_profile)
endif()

if(MOGO_ENABLE_HTTP)
  add_subdirectory(transports/http)
  add_subdirectory(platforms/desktop)
endif()

if(MOGO_BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()
