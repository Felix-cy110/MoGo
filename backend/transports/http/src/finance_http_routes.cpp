#include "mogo/http/finance_http_routes.hpp"

#include "finance_http_json.hpp"
#include "mogo/core_shared/error.hpp"

namespace mogo::http {

using mogo::core_shared::ApplicationError;
using namespace mogo::personal_finance;
using namespace finance_json;

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
            return dashboard(service_.getDashboard(date));
        });
    });

    router.GET("/api/analytics", [this](const HttpContextPtr& context) {
        return respond(context, [this, context] {
            const std::string start_date = context->param("startDate");
            const std::string end_date = context->param("endDate");
            if (start_date.empty() || end_date.empty()) {
                throw ApplicationError(400, "VALIDATION_ERROR", "缺少统计日期范围");
            }
            return analytics(service_.getAnalytics(start_date, end_date));
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
            return mutation(service_.addExpense(ExpenseInput{
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
            return mutation(service_.updateExpense(expense_id, ExpenseUpdateInput{
                .amount_cents = requiredInteger(body, "amountCents"),
                .category_id = requiredInteger(body, "categoryId"),
                .note = optionalString(body, "note"),
            }));
        });
    });
}

}  // namespace mogo::http
