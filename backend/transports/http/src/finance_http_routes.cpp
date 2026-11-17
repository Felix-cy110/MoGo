#include "mogo/http/finance_http_routes.hpp"

#include "mogo/core_shared/error.hpp"

#include <cstdint>
#include <functional>
#include <optional>
#include <string>

namespace mogo::http {
namespace {

using mogo::core_shared::ApplicationError;
using namespace mogo::personal_finance;

hv::Json categoryJson(const Category& category) {
    return {
        {"id", category.id},
        {"code", category.code},
        {"name", category.name},
        {"i18nKey", category.i18n_key ? hv::Json(*category.i18n_key) : hv::Json(nullptr)},
        {"notePolicy", category.note_policy},
        {"active", category.active},
        {"system", category.system},
        {"sortOrder", category.sort_order},
    };
}

hv::Json expenseJson(const Expense& expense) {
    return {
        {"id", expense.id},
        {"expenseDate", expense.expense_date},
        {"amountCents", expense.amount_cents},
        {"categoryId", expense.category_id},
        {"categoryCode", expense.category_code},
        {"categoryName", expense.category_name},
        {"note", expense.note ? hv::Json(*expense.note) : hv::Json(nullptr)},
        {"occurredAt", expense.occurred_at},
    };
}

hv::Json alertJson(const Alert& alert) {
    return {
        {"code", alert.code},
        {"severity", alert.severity},
        {"thresholdPercent", alert.threshold_percent},
        {"messageKey", alert.message_key},
        {"totalAmountCents", alert.total_amount_cents},
        {"budgetAmountCents", alert.budget_amount_cents},
    };
}

hv::Json analyticsJson(const AnalyticsDashboard& dashboard) {
    hv::Json days = hv::Json::array();
    for (const auto& day : dashboard.days) {
        days.push_back({
            {"date", day.date},
            {"amountCents", day.amount_cents},
            {"expenseCount", day.expense_count},
        });
    }
    hv::Json totals = hv::Json::array();
    for (const auto& total : dashboard.category_totals) {
        totals.push_back({
            {"categoryId", total.category_id},
            {"categoryCode", total.category_code},
            {"categoryName", total.category_name},
            {"amountCents", total.amount_cents},
            {"expenseCount", total.expense_count},
        });
    }
    return {
        {"startDate", dashboard.start_date},
        {"endDate", dashboard.end_date},
        {"totalAmountCents", dashboard.total_amount_cents},
        {"expenseCount", dashboard.expense_count},
        {"days", std::move(days)},
        {"categoryTotals", std::move(totals)},
    };
}

hv::Json mutationJson(const ExpenseMutationResult& result) {
    hv::Json alerts = hv::Json::array();
    for (const auto& alert : result.alerts) alerts.push_back(alertJson(alert));
    return {
        {"expense", expenseJson(result.expense)},
        {"totalAmountCents", result.total_amount_cents},
        {"budgetAmountCents", result.budget_amount_cents},
        {"remainingAmountCents", result.remaining_amount_cents},
        {"usagePercent", result.usage_percent},
        {"alerts", std::move(alerts)},
    };
}

hv::Json dashboardJson(const Dashboard& dashboard) {
    hv::Json totals = hv::Json::array();
    for (const auto& total : dashboard.category_totals) {
        totals.push_back({
            {"categoryId", total.category_id},
            {"categoryCode", total.category_code},
            {"categoryName", total.category_name},
            {"amountCents", total.amount_cents},
            {"expenseCount", total.expense_count},
        });
    }
    hv::Json expenses = hv::Json::array();
    for (const auto& expense : dashboard.expenses) expenses.push_back(expenseJson(expense));
    return {
        {"date", dashboard.date},
        {"budgetSet", dashboard.budget_set},
        {"budgetAmountCents", dashboard.budget_amount_cents},
        {"totalAmountCents", dashboard.total_amount_cents},
        {"remainingAmountCents", dashboard.remaining_amount_cents},
        {"usagePercent", dashboard.usage_percent},
        {"expenseCount", dashboard.expense_count},
        {"categoryTotals", std::move(totals)},
        {"expenses", std::move(expenses)},
    };
}

hv::Json parseBody(const HttpContextPtr& context) {
    if (context->body().empty()) {
        throw ApplicationError(400, "VALIDATION_ERROR", "请求体不能为空");
    }
    try {
        const auto body = hv::Json::parse(context->body());
        if (!body.is_object()) throw ApplicationError(400, "VALIDATION_ERROR", "请求体必须是 JSON 对象");
        return body;
    } catch (const ApplicationError&) {
        throw;
    } catch (const std::exception&) {
        throw ApplicationError(400, "VALIDATION_ERROR", "JSON 请求体无效");
    }
}

std::string requiredString(const hv::Json& body, const char* key) {
    if (!body.contains(key) || !body.at(key).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("缺少字段：") + key);
    }
    return body.at(key).get<std::string>();
}

std::int64_t requiredInteger(const hv::Json& body, const char* key) {
    if (!body.contains(key) || !body.at(key).is_number_integer()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("缺少字段：") + key);
    }
    return body.at(key).get<std::int64_t>();
}

std::int64_t pathInteger(const HttpContextPtr& context, const char* key, const char* message) {
    try {
        const auto value = std::stoll(context->param(key));
        if (value <= 0) throw std::invalid_argument("non-positive id");
        return value;
    } catch (const std::exception&) {
        throw ApplicationError(400, "VALIDATION_ERROR", message);
    }
}

std::optional<std::string> optionalString(const hv::Json& body, const char* key) {
    if (!body.contains(key) || body.at(key).is_null()) return std::nullopt;
    if (!body.at(key).is_string()) {
        throw ApplicationError(400, "VALIDATION_ERROR", std::string("字段类型错误：") + key);
    }
    return body.at(key).get<std::string>();
}

int respond(const HttpContextPtr& context, const std::function<hv::Json()>& action,
            int success_status = 200) {
    try {
        context->response->status_code = static_cast<http_status>(success_status);
        return context->sendJson(action());
    } catch (const ApplicationError& error) {
        context->response->status_code = static_cast<http_status>(error.httpStatus());
        return context->sendJson(hv::Json{{"code", error.code()}, {"message", error.what()}});
    } catch (const std::exception& error) {
        context->response->status_code = HTTP_STATUS_INTERNAL_SERVER_ERROR;
        return context->sendJson(hv::Json{{"code", "INTERNAL_ERROR"}, {"message", error.what()}});
    }
}

}  // namespace

void FinanceHttpRoutes::registerRoutes(hv::HttpService& router) {
    router.GET("/api/categories", [this](const HttpContextPtr& context) {
        return respond(context, [this] {
            hv::Json response = hv::Json::array();
            for (const auto& category : service_.getCategories()) response.push_back(categoryJson(category));
            return response;
        });
    });

    router.GET("/api/categories/manage", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            hv::Json response = hv::Json::array();
            for (const auto& category : service_.searchCategories(context->param("query"))) {
                response.push_back(categoryJson(category));
            }
            return response;
        });
    });

    router.POST("/api/categories", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = parseBody(context);
            return categoryJson(service_.addCategory(CategoryInput{.name = requiredString(body, "name")}));
        }, 200);
    });

    router.PUT("/api/categories/{categoryId}", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = parseBody(context);
            return categoryJson(service_.updateCategory(
                pathInteger(context, "categoryId", "分类 ID 无效"),
                CategoryInput{.name = requiredString(body, "name")}));
        });
    });

    router.Delete("/api/categories/{categoryId}", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            return categoryJson(service_.deleteCategory(
                pathInteger(context, "categoryId", "分类 ID 无效")));
        });
    });

    router.GET("/api/dashboard", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const std::string date = context->param("date");
            if (date.empty()) throw ApplicationError(400, "VALIDATION_ERROR", "缺少日期参数");
            return dashboardJson(service_.getDashboard(date));
        });
    });

    router.GET("/api/analytics", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const std::string start_date = context->param("startDate");
            const std::string end_date = context->param("endDate");
            if (start_date.empty() || end_date.empty()) {
                throw ApplicationError(400, "VALIDATION_ERROR", "缺少统计日期范围");
            }
            return analyticsJson(service_.getAnalytics(start_date, end_date));
        });
    });

    router.PUT("/api/budgets/daily", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = parseBody(context);
            const auto result = service_.saveBudget(BudgetInput{
                .date = requiredString(body, "date"),
                .amount_cents = requiredInteger(body, "amountCents"),
            });
            return hv::Json{{"date", result.date}, {"amountCents", result.amount_cents},
                            {"currencyCode", "CNY"}};
        });
    });

    router.POST("/api/expenses", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto body = parseBody(context);
            return mutationJson(service_.addExpense(ExpenseInput{
                .date = requiredString(body, "date"),
                .amount_cents = requiredInteger(body, "amountCents"),
                .category_id = requiredInteger(body, "categoryId"),
                .note = optionalString(body, "note"),
                .client_request_id = optionalString(body, "clientRequestId"),
            }));
        });
    });

    router.PUT("/api/expenses/{expenseId}", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const auto expense_id = pathInteger(context, "expenseId", "消费记录 ID 无效");
            const auto body = parseBody(context);
            return mutationJson(service_.updateExpense(expense_id, ExpenseUpdateInput{
                .amount_cents = requiredInteger(body, "amountCents"),
                .category_id = requiredInteger(body, "categoryId"),
                .note = optionalString(body, "note"),
            }));
        });
    });
}

}  // namespace mogo::http
