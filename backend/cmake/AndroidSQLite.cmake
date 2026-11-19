# Android has no public NDK libsqlite3. Compile the pinned upstream amalgamation.
FetchContent_Declare(mogo_sqlite
  URL https://www.sqlite.org/2025/sqlite-amalgamation-3500400.zip
  URL_HASH SHA256=1d3049dd0f830a025a53105fc79fd2ab9431aea99e137809d064d8ee8356b032
)
FetchContent_MakeAvailable(mogo_sqlite)
add_library(mogo_sqlite STATIC "${mogo_sqlite_SOURCE_DIR}/sqlite3.c")
target_include_directories(mogo_sqlite PUBLIC "${mogo_sqlite_SOURCE_DIR}")
target_compile_definitions(mogo_sqlite PRIVATE SQLITE_THREADSAFE=1 SQLITE_OMIT_LOAD_EXTENSION=1)
set_target_properties(mogo_sqlite PROPERTIES POSITION_INDEPENDENT_CODE ON)
add_library(SQLite::SQLite3 ALIAS mogo_sqlite)
