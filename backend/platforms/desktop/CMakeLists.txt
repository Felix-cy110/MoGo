add_executable(mogo_backend main.cpp)
target_link_libraries(mogo_backend PRIVATE mogo_http_transport)
if(MOGO_FEATURE_DATA_BACKUP)
  target_link_libraries(mogo_backend PRIVATE mogo_data_backup_local)
endif()
if(MOGO_FEATURE_PERSONAL_FINANCE)
  target_link_libraries(mogo_backend PRIVATE mogo_personal_finance_sqlite)
endif()
if(MOGO_FEATURE_USER_PROFILE)
  target_link_libraries(mogo_backend PRIVATE mogo_user_profile_json)
endif()

set_target_properties(mogo_backend PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

if(MOGO_FEATURE_INVESTMENT_MANAGEMENT)
  target_link_libraries(mogo_backend PRIVATE mogo_investment_sqlite)
endif()
