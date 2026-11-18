add_library(mogo_personal_finance_domain INTERFACE)
target_include_directories(mogo_personal_finance_domain INTERFACE domain/include)

add_library(mogo_personal_finance_application
  application/src/alert_service.cpp
  application/src/application_support.cpp
  application/src/budget_service.cpp
  application/src/category_service.cpp
  application/src/expense_service.cpp
  application/src/finance_query_service.cpp
  application/src/finance_service.cpp
)
target_include_directories(mogo_personal_finance_application PUBLIC application/include)
target_link_libraries(mogo_personal_finance_application
  PUBLIC mogo_personal_finance_domain mogo_core_shared
)

add_library(mogo_personal_finance_sqlite
  infrastructure/sqlite/src/sqlite_alert_repository.cpp
  infrastructure/sqlite/src/sqlite_budget_repository.cpp
  infrastructure/sqlite/src/sqlite_category_repository.cpp
  infrastructure/sqlite/src/sqlite_database.cpp
  infrastructure/sqlite/src/sqlite_expense_repository.cpp
  infrastructure/sqlite/src/sqlite_finance_read_repository.cpp
  infrastructure/sqlite/src/sqlite_finance_repository.cpp
  infrastructure/sqlite/src/sqlite_migrations.cpp
  infrastructure/sqlite/src/sqlite_support.cpp
)
target_include_directories(mogo_personal_finance_sqlite PUBLIC infrastructure/sqlite/include)
target_link_libraries(mogo_personal_finance_sqlite
  PUBLIC mogo_personal_finance_application SQLite::SQLite3
)
