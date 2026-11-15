package com.mogo.finance.config;

import com.mogo.finance.entity.AlertRuleEntity;
import com.mogo.finance.entity.ExpenseCategoryEntity;
import com.mogo.finance.repository.AlertRuleRepository;
import com.mogo.finance.repository.ExpenseCategoryRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Configuration
public class DataInitializer {
    @Bean
    ApplicationRunner seedFinanceDefaults(ExpenseCategoryRepository categories, AlertRuleRepository rules) {
        return args -> seed(categories, rules);
    }

    @Transactional
    void seed(ExpenseCategoryRepository categories, AlertRuleRepository rules) {
        List<CategorySeed> categorySeeds = List.of(
                new CategorySeed("MEAL", "正餐", "category.meal", "OPTIONAL", 10),
                new CategorySeed("COMMUTE", "通勤", "category.commute", "OPTIONAL", 20),
                new CategorySeed("SNACK", "随心吃", "category.snack", "OPTIONAL", 30),
                new CategorySeed("OTHER", "其他", "category.other", "REQUIRED", 40)
        );
        for (CategorySeed seed : categorySeeds) {
            if (categories.findByCode(seed.code()).isEmpty()) {
                ExpenseCategoryEntity category = new ExpenseCategoryEntity();
                category.setCode(seed.code());
                category.setName(seed.name());
                category.setI18nKey(seed.i18nKey());
                category.setNotePolicy(seed.notePolicy());
                category.setSystem(true);
                category.setSortOrder(seed.sortOrder());
                categories.save(category);
            }
        }

        List<RuleSeed> ruleSeeds = List.of(
                new RuleSeed("BUDGET_WARNING", 80, "WARNING", "alert.budget.warning"),
                new RuleSeed("BUDGET_EXCEEDED", 100, "DANGER", "alert.budget.exceeded")
        );
        for (RuleSeed seed : ruleSeeds) {
            if (rules.findByCode(seed.code()).isEmpty()) {
                AlertRuleEntity rule = new AlertRuleEntity();
                rule.setCode(seed.code());
                rule.setThresholdPercent(seed.threshold());
                rule.setSeverity(seed.severity());
                rule.setMessageKey(seed.messageKey());
                rules.save(rule);
            }
        }
    }

    private record CategorySeed(String code, String name, String i18nKey, String notePolicy, int sortOrder) {}
    private record RuleSeed(String code, int threshold, String severity, String messageKey) {}
}
