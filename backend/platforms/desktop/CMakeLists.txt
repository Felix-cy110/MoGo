add_executable(mogo_backend main.cpp)
target_link_libraries(mogo_backend
  PRIVATE mogo_http_transport mogo_personal_finance_sqlite
)

set_target_properties(mogo_backend PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
