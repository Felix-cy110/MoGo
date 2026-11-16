package com.mogo.finance.service.impl;

import com.mogo.finance.entity.*;
import com.mogo.finance.entity.ApiModels.BudgetRequest;
import com.mogo.finance.entity.ApiModels.CategoryRequest;
import com.mogo.finance.entity.ApiModels.ExpenseRequest;
import com.mogo.finance.entity.ApiModels.ExpenseResponse;
import com.mogo.finance.repository.*;
import com.mogo.finance.service.FinanceService;
import com.mogo.finance.utils.FinanceException;
import com.mogo.finance.utils.MoneyUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class FinanceServiceImpl implements FinanceService {
    private final ExpenseCategoryRepository categoryRepository;
    private final DailyBudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;
    private final AlertRuleRepository ruleRepository;
    private final AlertDailyStateRepository stateRepository;
    private final AlertEventRepository eventRepository;

    public FinanceServiceImpl(ExpenseCategoryRepository categoryRepository,
                              DailyBudgetRepository budgetRepository,
                              ExpenseRepository expenseRepository,
                              AlertRuleRepository ruleRepository,
                              AlertDailyStateRepository stateRepository,
                              AlertEventRepository eventRepository) {
        this.categoryRepository = categoryRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
        this.ruleRepository = ruleRepository;
        this.stateRepository = stateRepository;
        this.eventRepository = eventRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExpenseCategoryView> getCategories() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAscIdAsc().stream()
                .map(category -> new ExpenseCategoryView(category.getId(), category.getCode(), category.getName(),
                        category.getI18nKey(), category.getNotePolicy(), category.isSystem(), category.getSortOrder()))
                .toList();
    }

    @Override
    @Transactional
    public ExpenseCategoryView addCategory(CategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new FinanceException(HttpStatus.CONFLICT, "CATEGORY_NAME_EXISTS", "分类名称已存在");
        }

        ExpenseCategoryEntity category = new ExpenseCategoryEntity();
        category.setCode("CUSTOM_" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT));
        category.setName(name);
        category.setI18nKey(null);
        category.setNotePolicy("OPTIONAL");
        category.setSystem(false);
        category.setActive(true);
        category.setSortOrder(categoryRepository.findMaxSortOrder() + 10);
        category = categoryRepository.save(category);
        return new ExpenseCategoryView(category.getId(), category.getCode(), category.getName(),
                category.getI18nKey(), category.getNotePolicy(), category.isSystem(), category.getSortOrder());
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardView getDashboard(LocalDate date) {
        long budget = budgetRepository.findByBudgetDate(date)
                .map(DailyBudgetEntity::getMaxAmountCents).orElse(0L);
        List<ExpenseEntity> expenses = expenseRepository.findByExpenseDateOrderByOccurredAtDescIdDesc(date);
        long total = expenses.stream().mapToLong(ExpenseEntity::getAmountCents).sum();
        List<DashboardView.CategoryTotal> totals = expenses.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        expense -> expense.getCategory().getId(),
                        java.util.LinkedHashMap::new,
                        java.util.stream.Collectors.toList()))
                .values().stream()
                .map(group -> {
                    ExpenseCategoryEntity category = group.get(0).getCategory();
                    return new DashboardView.CategoryTotal(category.getId(), category.getCode(), category.getName(),
                            group.stream().mapToLong(ExpenseEntity::getAmountCents).sum(), group.size());
                })
                .sorted((a, b) -> Long.compare(b.amountCents(), a.amountCents()))
                .toList();
        List<ExpenseView> views = expenses.stream().map(this::toExpenseView).toList();
        return new DashboardView(date.toString(), budget > 0, budget, total,
                Math.max(0, budget - total), MoneyUtils.usagePercent(total, budget), expenses.size(), totals, views);
    }

    @Override
    @Transactional
    public DailyBudgetEntity saveBudget(BudgetRequest request) {
        DailyBudgetEntity budget = budgetRepository.findByBudgetDate(request.date()).orElseGet(DailyBudgetEntity::new);
        budget.setBudgetDate(request.date());
        budget.setMaxAmountCents(request.amountCents());
        return budgetRepository.save(budget);
    }

    @Override
    @Transactional
    public ExpenseResponse addExpense(ExpenseRequest request) {
        if (request.clientRequestId() != null && !request.clientRequestId().isBlank()) {
            var existing = expenseRepository.findByClientRequestId(request.clientRequestId());
            if (existing.isPresent()) return responseFor(existing.get(), List.of());
        }

        ExpenseCategoryEntity category = categoryRepository.findById(request.categoryId())
                .filter(ExpenseCategoryEntity::isActive)
                .orElseThrow(() -> new FinanceException(HttpStatus.BAD_REQUEST, "CATEGORY_NOT_FOUND", "所选分类不可用"));
        String note = request.note() == null ? null : request.note().trim();
        if ("REQUIRED".equals(category.getNotePolicy()) && (note == null || note.isBlank())) {
            throw new FinanceException(HttpStatus.BAD_REQUEST, "NOTE_REQUIRED", "此分类需要填写备注");
        }
        if ("FORBIDDEN".equals(category.getNotePolicy())) note = null;

        ExpenseEntity expense = new ExpenseEntity();
        expense.setExpenseDate(request.date());
        expense.setAmountCents(request.amountCents());
        expense.setCategory(category);
        expense.setNote(note == null || note.isBlank() ? null : note);
        expense.setOccurredAt(LocalDateTime.now());
        expense.setClientRequestId(request.clientRequestId());
        expense = expenseRepository.saveAndFlush(expense);

        long total = expenseRepository.sumAmountByDate(request.date());
        long budgetAmount = budgetRepository.findByBudgetDate(request.date())
                .map(DailyBudgetEntity::getMaxAmountCents).orElse(0L);
        List<AlertView> alerts = budgetAmount > 0 ? evaluateAlerts(request.date(), expense, total, budgetAmount) : List.of();
        return new ExpenseResponse(toExpenseView(expense), total, budgetAmount,
                Math.max(0, budgetAmount - total), MoneyUtils.usagePercent(total, budgetAmount), alerts);
    }

    private List<AlertView> evaluateAlerts(LocalDate date, ExpenseEntity expense, long total, long budget) {
        return ruleRepository.findByActiveTrueOrderByThresholdPercentAsc().stream()
                .filter(rule -> {
                    AlertDailyStateId stateId = new AlertDailyStateId(date, rule.getId());
                    AlertDailyStateEntity state = stateRepository.findById(stateId).orElseGet(() -> {
                        AlertDailyStateEntity created = new AlertDailyStateEntity();
                        created.setBudgetDate(date);
                        created.setRuleId(rule.getId());
                        return created;
                    });
                    boolean reached = MoneyUtils.reachedThreshold(total, budget, rule.getThresholdPercent());
                    boolean crossedNow = reached && !state.isTriggered();
                    state.setTriggered(reached);
                    state.setLastTotalCents(total);
                    state.setLastExpenseId(expense.getId());
                    state.setUpdatedAt(LocalDateTime.now());
                    if (crossedNow) state.setTriggeredAt(LocalDateTime.now());
                    else if (!reached) state.setTriggeredAt(null);
                    stateRepository.save(state);

                    if (crossedNow) {
                        AlertEventEntity event = new AlertEventEntity();
                        event.setBudgetDate(date);
                        event.setRule(rule);
                        event.setExpense(expense);
                        event.setEventType("THRESHOLD_CROSSED");
                        event.setTotalAmountCents(total);
                        event.setBudgetAmountCents(budget);
                        event.setThresholdPercent(rule.getThresholdPercent());
                        event.setMessageKey(rule.getMessageKey());
                        eventRepository.save(event);
                    }
                    return crossedNow;
                })
                .map(rule -> new AlertView(rule.getCode(), rule.getSeverity(), rule.getThresholdPercent(),
                        rule.getMessageKey(), total, budget))
                .toList();
    }

    private ExpenseResponse responseFor(ExpenseEntity expense, List<AlertView> alerts) {
        long total = expenseRepository.sumAmountByDate(expense.getExpenseDate());
        long budget = budgetRepository.findByBudgetDate(expense.getExpenseDate())
                .map(DailyBudgetEntity::getMaxAmountCents).orElse(0L);
        return new ExpenseResponse(toExpenseView(expense), total, budget,
                Math.max(0, budget - total), MoneyUtils.usagePercent(total, budget), alerts);
    }

    private ExpenseView toExpenseView(ExpenseEntity expense) {
        ExpenseCategoryEntity category = expense.getCategory();
        return new ExpenseView(expense.getId(), expense.getExpenseDate().toString(), expense.getAmountCents(),
                category.getId(), category.getCode(), category.getName(), expense.getNote(), expense.getOccurredAt());
    }
}
