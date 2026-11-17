#include "hv/HttpServer.h"
#include "hv/hlog.h"
#include "mogo/http/finance_http_routes.hpp"
#include "mogo/personal_finance/application/finance_service.hpp"
#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

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
};

Options parseOptions(int argc, char** argv) {
    Options options;
    for (int index = 1; index < argc; ++index) {
        const std::string argument = argv[index];
        if (argument == "--host" && index + 1 < argc) options.host = argv[++index];
        else if (argument == "--port" && index + 1 < argc) options.port = std::stoi(argv[++index]);
        else if (argument == "--database" && index + 1 < argc) options.database = argv[++index];
        else throw std::invalid_argument("Unknown or incomplete argument: " + argument);
    }
    return options;
}

}  // namespace

int main(int argc, char** argv) {
    try {
        const Options options = parseOptions(argc, argv);
        mogo::personal_finance::SqliteFinanceRepository repository(options.database);
        mogo::personal_finance::FinanceService finance_service(repository);

        hv::HttpService router;
        mogo::http::FinanceHttpRoutes finance_routes(finance_service);
        finance_routes.registerRoutes(router);

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
        std::cout << "SQLite：" << options.database << '\n';
        while (running) std::this_thread::sleep_for(std::chrono::milliseconds(200));
        server.stop();
        return EXIT_SUCCESS;
    } catch (const std::exception& error) {
        std::cerr << "MoGo 后端启动失败：" << error.what() << '\n';
        return EXIT_FAILURE;
    }
}
