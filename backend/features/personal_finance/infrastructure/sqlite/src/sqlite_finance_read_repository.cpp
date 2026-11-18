#include "mogo/personal_finance/sqlite/sqlite_finance_repository.hpp"

#include "sqlite_support.hpp"

namespace mogo::personal_finance {

using sqlite_support::Statement;

AnalyticsDashboard SqliteFinanceRepository::analyticsForRange(
    const std::string& start_date, const std::string& end_date) {
    AnalyticsDashboard dashboard{
        .start_date = start_date,
        .end_date = end_date,
    };

    Statement daily(database_.handle(), R"SQL(
SELECT expense_date, COALESCE(SUM(amount_cents), 0), COUNT(*)
FROM expenses
WHERE expense_date BETWEEN ? AND ?
GROUP BY expense_date
ORDER BY expense_date ASC
)SQL");
    daily.bind(1, start_date);
    daily.bind(2, end_date);
    while (daily.row()) {
        DailyTotal total{
            .date = daily.text(0),
            .amount_cents = daily.integer(1),
            .expense_count = daily.intValue(2),
        };
        dashboard.total_amount_cents += total.amount_cents;
        dashboard.expense_count += total.expense_count;
        dashboard.days.push_back(std::move(total));
    }

    Statement categories(database_.handle(), R"SQL(
SELECT c.id, c.code, c.name, COALESCE(SUM(e.amount_cents), 0), COUNT(*)
FROM expenses e
JOIN expense_categories c ON c.id = e.category_id
WHERE e.expense_date BETWEEN ? AND ?
GROUP BY c.id, c.code, c.name
ORDER BY SUM(e.amount_cents) DESC, c.id ASC
)SQL");
    categories.bind(1, start_date);
    categories.bind(2, end_date);
    while (categories.row()) {
        dashboard.category_totals.push_back(CategoryTotal{
            .category_id = categories.integer(0),
            .category_code = categories.text(1),
            .category_name = categories.text(2),
            .amount_cents = categories.integer(3),
            .expense_count = categories.intValue(4),
        });
    }
    return dashboard;
}


}  // namespace mogo::personal_finance
