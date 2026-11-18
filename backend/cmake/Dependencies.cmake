include(FetchContent)

set(FETCHCONTENT_UPDATES_DISCONNECTED ON)

if(MOGO_FEATURE_PERSONAL_FINANCE)
  find_package(SQLite3 REQUIRED)
endif()

if(MOGO_FEATURE_USER_PROFILE)
  set(JSON_BuildTests OFF CACHE BOOL "" FORCE)
  FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.12.0
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(nlohmann_json)
endif()

if(MOGO_ENABLE_HTTP)
  set(BUILD_SHARED OFF CACHE BOOL "" FORCE)
  set(BUILD_STATIC ON CACHE BOOL "" FORCE)
  set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
  set(BUILD_UNITTEST OFF CACHE BOOL "" FORCE)
  set(WITH_HTTP ON CACHE BOOL "" FORCE)
  set(WITH_HTTP_SERVER ON CACHE BOOL "" FORCE)
  set(WITH_HTTP_CLIENT OFF CACHE BOOL "" FORCE)
  set(WITH_SSL OFF CACHE BOOL "" FORCE)

  FetchContent_Declare(
    libhv
    GIT_REPOSITORY https://github.com/ithewei/libhv.git
    GIT_TAG v1.3.4
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(libhv)
endif()
