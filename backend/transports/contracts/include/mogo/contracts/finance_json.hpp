#pragma once

#include "mogo/personal_finance/domain/models.hpp"

namespace mogo::contracts::finance {
using namespace mogo::personal_finance;

// One wire contract for HTTP and native adapters; no transport dependency.
template <typename Json>
Json categoryJson(const Category& value) {
    return {{"id", value.id}, {"code", value.code}, {"name", value.name},
            {"i18nKey", value.i18n_key ? Json(*value.i18n_key) : Json(nullptr)},
            {"notePolicy", value.note_policy}, {"active", value.active},
            {"system", value.system}, {"sortOrder", value.sort_order}};
}


template <typename Json>
Json expense(const Expense& value) {
    return {{"id", value.id}, {"expenseDate", value.expense_date},
            {"amountCents", value.amount_cents}, {"categoryId", value.category_id},
            {"categoryCode", value.category_code}, {"categoryName", value.category_name},
            {"note", value.note ? Json(*value.note) : Json(nullptr)},
            {"occurredAt", value.occurred_at}};
}

template <typename Json>
Json alert(const Alert& value) {
    return {{"code", value.code}, {"severity", value.severity},
            {"thresholdPercent", value.threshold_percent}, {"messageKey", value.message_key},
            {"totalAmountCents", value.total_amount_cents},
            {"budgetAmountCents", value.budget_amount_cents}};
}

template <typename Json>
Json categoryTotals(const std::vector<CategoryTotal>& values) {
    Json totals = Json::array();
    for (const auto& value : values) {
        totals.push_back({{"categoryId", value.category_id}, {"categoryCode", value.category_code},
                          {"categoryName", value.category_name}, {"amountCents", value.amount_cents},
                          {"expenseCount", value.expense_count}});
    }
    return totals;
}


template <typename Json>
Json analytics(const AnalyticsDashboard& value) {
    Json days = Json::array();
    for (const auto& day : value.days) {
        days.push_back({{"date", day.date}, {"amountCents", day.amount_cents},
                        {"expenseCount", day.expense_count}});
    }
    return {{"startDate", value.start_date}, {"endDate", value.end_date},
            {"totalAmountCents", value.total_amount_cents}, {"expenseCount", value.expense_count},
            {"days", std::move(days)}, {"categoryTotals", categoryTotals<Json>(value.category_totals)}};
}

template <typename Json>
Json mutation(const ExpenseMutationResult& value) {
    Json alerts = Json::array();
    for (const auto& item : value.alerts) alerts.push_back(alert<Json>(item));
    return {{"expense", expense<Json>(value.expense)}, {"totalAmountCents", value.total_amount_cents},
            {"budgetAmountCents", value.budget_amount_cents},
            {"remainingAmountCents", value.remaining_amount_cents},
            {"usagePercent", value.usage_percent}, {"alerts", std::move(alerts)}};
}

template <typename Json>
Json dashboard(const Dashboard& value) {
    Json expenses = Json::array();
    for (const auto& item : value.expenses) expenses.push_back(expense<Json>(item));
    return {{"date", value.date}, {"budgetSet", value.budget_set},
            {"budgetAmountCents", value.budget_amount_cents},
            {"totalAmountCents", value.total_amount_cents},
            {"remainingAmountCents", value.remaining_amount_cents},
            {"usagePercent", value.usage_percent}, {"expenseCount", value.expense_count},
            {"categoryTotals", categoryTotals<Json>(value.category_totals)},
            {"expenses", std::move(expenses)}};
}

}  // namespace mogo::contracts::finance
