#pragma once

#include "mogo/personal_finance/application/finance_inputs.hpp"
#include "mogo/personal_finance/application/finance_repository.hpp"

namespace mogo::personal_finance {

class CategoryService final {
public:
    CategoryService(CategoryRepository& categories, FinanceTransactionRepository& transactions)
        : categories_(categories), transactions_(transactions) {}

    std::vector<Category> getCategories();
    std::vector<Category> searchCategories(const std::string& query);
    Category addCategory(const CategoryInput& input);
    Category updateCategory(std::int64_t category_id, const CategoryInput& input);
    Category deleteCategory(std::int64_t category_id);
    Category requireActiveCategory(std::int64_t category_id);

private:
    std::string validateCategoryName(const std::string& raw_name);

    CategoryRepository& categories_;
    FinanceTransactionRepository& transactions_;
};

}  // namespace mogo::personal_finance
