#include "mogo/personal_finance/application/expense_service.hpp"

#include "mogo/personal_finance/application/application_support.hpp"
#include "mogo/core_shared/error.hpp"

namespace mogo::personal_finance {

using mogo::core_shared::ApplicationError;

ExpenseMutationResult ExpenseService::addExpense(const ExpenseInput& input) {
    validateDate(input.date);
    if (input.amount_cents <= 0) {
        throw ApplicationError(400, "VALIDATION_ERROR", "消费金额必须大于零");
    }

    std::optional<std::string> request_id;
    if (input.client_request_id) {
        const std::string normalized = trimText(*input.client_request_id);
        if (utf8Length(normalized) > 80) {
            throw ApplicationError(400, "VALIDATION_ERROR", "客户端请求 ID 不能超过 80 个字符");
        }
        if (!normalized.empty()) request_id = normalized;
    }
    if (request_id) {
        if (const auto existing = expenses_.expenseByClientRequestId(*request_id)) {
            return responseFor(*existing, {});
        }
    }

    const Category category = categories_.requireActiveCategory(input.category_id);
    const auto note = normalizeNote(category, input.note);
    FinanceTransaction transaction(transactions_);
    const Expense expense = expenses_.insertExpense(input.date, input.amount_cents, category, note,
                                                     request_id, nowLocal());
    const MoneyCents total = expenses_.sumExpensesForDate(input.date);
    const MoneyCents budget = budgets_.budgetForDate(input.date).value_or(0);
    auto alerts = budget > 0 ? alerts_.evaluate(input.date, expense, total, budget)
                             : std::vector<Alert>{};
    transaction.commit();

    const BudgetUsage usage(total, budget);
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = usage.remainingCents(),
        .usage_percent = usage.percentage(),
        .alerts = std::move(alerts),
    };
}

ExpenseMutationResult ExpenseService::updateExpense(std::int64_t expense_id,
                                                     const ExpenseUpdateInput& input) {
    if (input.amount_cents <= 0) {
        throw ApplicationError(400, "VALIDATION_ERROR", "消费金额必须大于零");
    }
    const auto existing = expenses_.expenseById(expense_id);
    if (!existing) throw ApplicationError(404, "EXPENSE_NOT_FOUND", "消费记录不存在");

    const Category category = categories_.requireActiveCategory(input.category_id);
    const auto note = normalizeNote(category, input.note);
    FinanceTransaction transaction(transactions_);
    const Expense expense = expenses_.updateExpense(expense_id, input.amount_cents, category, note);
    const MoneyCents total = expenses_.sumExpensesForDate(expense.expense_date);
    const MoneyCents budget = budgets_.budgetForDate(expense.expense_date).value_or(0);
    auto alerts = budget > 0 ? alerts_.evaluate(expense.expense_date, expense, total, budget)
                             : std::vector<Alert>{};
    transaction.commit();

    const BudgetUsage usage(total, budget);
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = usage.remainingCents(),
        .usage_percent = usage.percentage(),
        .alerts = std::move(alerts),
    };
}

std::optional<std::string> ExpenseService::normalizeNote(
    const Category& category, const std::optional<std::string>& raw_note) {
    std::optional<std::string> note;
    if (raw_note) {
        const std::string normalized = trimText(*raw_note);
        if (!normalized.empty()) note = normalized;
    }
    if (category.requiresNote() && !note) {
        throw ApplicationError(400, "NOTE_REQUIRED", "此分类需要填写备注");
    }
    if (category.forbidsNote()) return std::nullopt;
    if (note && utf8Length(*note) > 500) {
        throw ApplicationError(400, "VALIDATION_ERROR", "备注不能超过 500 个字符");
    }
    return note;
}

ExpenseMutationResult ExpenseService::responseFor(const Expense& expense,
                                                   std::vector<Alert> alerts) {
    const MoneyCents total = expenses_.sumExpensesForDate(expense.expense_date);
    const MoneyCents budget = budgets_.budgetForDate(expense.expense_date).value_or(0);
    const BudgetUsage usage(total, budget);
    return ExpenseMutationResult{
        .expense = expense,
        .total_amount_cents = total,
        .budget_amount_cents = budget,
        .remaining_amount_cents = usage.remainingCents(),
        .usage_percent = usage.percentage(),
        .alerts = std::move(alerts),
    };
}

}  // namespace mogo::personal_finance
