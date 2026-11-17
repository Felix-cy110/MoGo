add_library(mogo_http_transport
  src/finance_http_routes.cpp
)
target_include_directories(mogo_http_transport PUBLIC include)
target_link_libraries(mogo_http_transport
  PUBLIC mogo_personal_finance_application hv_static
)
