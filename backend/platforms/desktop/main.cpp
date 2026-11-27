#include "hv/HttpServer.h"
#include "hv/hlog.h"
#ifdef MOGO_FEATURE_DATA_BACKUP
#include "mogo/data_backup/local/local_backup_service.hpp"
#include "mogo/http/data_backup_http_routes.hpp"
#endif
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
#include "mogo/http/finance_http_routes.hpp"
#include "mogo/personal_finance/application/finance_service.hpp"
#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
#include "mogo/http/user_profile_http_routes.hpp"
#include "mogo/user_profile/application/profile_service.hpp"
#include "mogo/user_profile/json/json_profile_repository.hpp"
#endif

#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
#include "mogo/http/investment_http_routes.hpp"
#include "mogo/investment/sqlite/sqlite_repository.hpp"
#endif
#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <exception>
#include <iostream>
#include <stdexcept>
#include <string>
#include <thread>

namespace {

std::atomic_bool running{true};

void stopServer(int) {
    running = false;
}

struct Options {
    std::string host = "127.0.0.1";
    int port = 8080;
    std::string database = "data/mogo.db";
    std::string profile = "data/user-profile.json";
};

Options parseOptions(int argc, char** argv) {
    Options options;
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--host" && index + 1 < argc) options.host = argv[++index];
        else if (argument == "--port" && index + 1 < argc) options.port = std::stoi(argv[++index]);
        else if (argument == "--database" && index + 1 < argc) options.database = argv[++index];
        else if (argument == "--profile" && index + 1 < argc) options.profile = argv[++index];
        else throw std::invalid_argument("Unknown or incomplete argument: " + argument);
    }
    return options;
}

}  // namespace

int main(int argc, char** argv) {
    try {
        const Options options = parseOptions(argc, argv);
        hv::HttpService router;
        router.AllowCORS();
        router.GET("/api/health", [](const HttpContextPtr& context) {
            return context->sendJson(hv::Json{{"status", "ok"}, {"runtime", "cpp20-libhv"}});
        });

#ifdef MOGO_FEATURE_DATA_BACKUP
        mogo::data_backup::LocalBackupService backup_service(options.database, options.profile);
        mogo::http::DataBackupHttpRoutes backup_routes(backup_service);
        backup_routes.registerRoutes(router);
#endif

#ifdef MOGO_FEATURE_PERSONAL_FINANCE
        mogo::personal_finance::SqliteFinanceRepository repository(options.database);
        mogo::personal_finance::FinanceService finance_service(repository);
        mogo::http::FinanceHttpRoutes finance_routes(finance_service);
        finance_routes.registerRoutes(router);
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
        mogo::user_profile::JsonProfileRepository profile_repository(options.profile);
        mogo::user_profile::ProfileService profile_service(profile_repository);
        mogo::http::UserProfileHttpRoutes profile_routes(profile_service);
        profile_routes.registerRoutes(router);
#endif

#ifdef MOGO_FEATURE_INVESTMENT_MANAGEMENT
        mogo::investment::SqliteInvestmentRepository investment_repository(options.database);
        mogo::investment::InvestmentService investment_service(investment_repository);
        mogo::http::InvestmentHttpRoutes investment_routes(investment_service);
        investment_routes.registerRoutes(router);
#endif
        hlog_set_handler(stdout_logger);
        hv::HttpServer server(&router);
        server.setHost(options.host.c_str());
        server.setPort(options.port);
        server.setThreadNum(2);
        if (server.start() != 0) {
            std::cerr << "无法启动 MoGo HTTP 服务。\n";
            return EXIT_FAILURE;
        }

        std::signal(SIGINT, stopServer);
        std::signal(SIGTERM, stopServer);
        std::cout << "MoGo C++ 后端已启动：http://" << options.host << ':' << options.port << '\n';
#ifdef MOGO_FEATURE_PERSONAL_FINANCE
        std::cout << "SQLite：" << options.database << '\n';
#endif
#ifdef MOGO_FEATURE_USER_PROFILE
        std::cout << "User profile JSON: " << options.profile << '\n';
#endif
        while (running) std::this_thread::sleep_for(std::chrono::milliseconds(200));
        server.stop();
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "MoGo 后端启动失败：" << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
