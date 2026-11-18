#include "mogo/personal_finance/application/category_service.hpp"

#include "mogo/personal_finance/application/application_support.hpp"
#include "mogo/core_shared/error.hpp"

#include <random>

namespace mogo::personal_finance {
namespace {

using mogo::core_shared::ApplicationError;

std::string randomCategoryCode() {
    static constexpr char hex[] = "0123456789ABCDEF";
    std::random_device device;
    std::mt19937_64 generator(device());
    std::uniform_int_distribution<int> distribution(0, 15);
    std::string code = "CUSTOM_";
    code.reserve(39);
    for (int index = 0; index < 32; ++index) code.push_back(hex[distribution(generator)]);
    return code;
}

void requireMutableCategory(const Category& category) {
    if (category.isProtected()) {
        throw ApplicationError(403, "CATEGORY_PROTECTED", "其他是内置分类，不能修改或删除");
    }
}

}  // namespace

std::vector<Category> CategoryService::getCategories() { return categories_.categories(); }

std::vector<Category> CategoryService::searchCategories(const std::string& raw_query) {
    const std::string query = trimText(raw_query);
    if (utf8Length(query) > 80) {
        throw ApplicationError(400, "VALIDATION_ERROR", "分类搜索内容不能超过 80 个字符");
    }
    return categories_.searchCategories(query);
}

std::string CategoryService::validateCategoryName(const std::string& raw_name) {
    const std::string name = trimText(raw_name);
    if (name.empty() || utf8Length(name) > 80) {
        throw ApplicationError(400, "VALIDATION_ERROR", "分类名称不能为空且不能超过 80 个字符");
    }
    return name;
}

Category CategoryService::addCategory(const CategoryInput& input) {
    const std::string name = validateCategoryName(input.name);
    if (categories_.categoryNameExists(name)) {
        throw ApplicationError(409, "CATEGORY_NAME_EXISTS", "分类名称已存在");
    }

    FinanceTransaction transaction(transactions_);
    Category category{
        .code = randomCategoryCode(),
        .name = name,
        .i18n_key = std::nullopt,
        .note_policy = "OPTIONAL",
        .active = true,
        .system = false,
        .sort_order = categories_.maxCategorySortOrder() + 10,
    };
    category = categories_.insertCategory(category);
    transaction.commit();
    return category;
}

Category CategoryService::updateCategory(std::int64_t category_id, const CategoryInput& input) {
    const auto existing = categories_.categoryById(category_id);
    if (!existing) throw ApplicationError(404, "CATEGORY_NOT_FOUND", "分类不存在或已删除");
    requireMutableCategory(*existing);
    const std::string name = validateCategoryName(input.name);
    if (categories_.categoryNameExists(name, category_id)) {
        throw ApplicationError(409, "CATEGORY_NAME_EXISTS", "分类名称已存在");
    }
    FinanceTransaction transaction(transactions_);
    Category category = categories_.updateCategory(category_id, name);
    transaction.commit();
    return category;
}

Category CategoryService::deleteCategory(std::int64_t category_id) {
    const auto existing = categories_.categoryById(category_id);
    if (!existing) throw ApplicationError(404, "CATEGORY_NOT_FOUND", "分类不存在或已删除");
    requireMutableCategory(*existing);
    FinanceTransaction transaction(transactions_);
    Category category = categories_.deactivateCategory(category_id);
    transaction.commit();
    return category;
}

Category CategoryService::requireActiveCategory(std::int64_t category_id) {
    const auto category = categories_.categoryById(category_id);
    if (!category) throw ApplicationError(400, "CATEGORY_NOT_FOUND", "所选分类不可用");
    return *category;
}

}  // namespace mogo::personal_finance
