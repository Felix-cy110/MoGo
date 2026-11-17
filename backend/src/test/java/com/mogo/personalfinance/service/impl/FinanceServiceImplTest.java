package com.mogo.personalfinance.service.impl;

import com.mogo.personalfinance.entity.ApiModels.CategoryRequest;
import com.mogo.personalfinance.entity.ApiModels.ExpenseUpdateRequest;
import com.mogo.personalfinance.entity.ExpenseCategoryEntity;
import com.mogo.personalfinance.entity.ExpenseEntity;
import com.mogo.personalfinance.repository.AlertDailyStateRepository;
import com.mogo.personalfinance.repository.AlertEventRepository;
import com.mogo.personalfinance.repository.AlertRuleRepository;
import com.mogo.personalfinance.repository.DailyBudgetRepository;
import com.mogo.personalfinance.repository.ExpenseCategoryRepository;
import com.mogo.personalfinance.repository.ExpenseRepository;
import com.mogo.personalfinance.utils.FinanceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FinanceServiceImplTest {
    private ExpenseCategoryRepository categoryRepository;
    private DailyBudgetRepository budgetRepository;
    private ExpenseRepository expenseRepository;
    private AlertRuleRepository ruleRepository;
    private FinanceServiceImpl service;

    @BeforeEach
    void setUp() {
        categoryRepository = mock(ExpenseCategoryRepository.class);
        budgetRepository = mock(DailyBudgetRepository.class);
        expenseRepository = mock(ExpenseRepository.class);
        ruleRepository = mock(AlertRuleRepository.class);
        service = new FinanceServiceImpl(
                categoryRepository,
                budgetRepository,
                expenseRepository,
                ruleRepository,
                mock(AlertDailyStateRepository.class),
                mock(AlertEventRepository.class)
        );
    }

    @Test
    void addsTrimmedCustomCategoryAfterDefaultCategories() {
        when(categoryRepository.existsByNameIgnoreCase("日用品")).thenReturn(false);
        when(categoryRepository.findMaxSortOrder()).thenReturn(40);
        when(categoryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.addCategory(new CategoryRequest("  日用品  "));

        ArgumentCaptor<ExpenseCategoryEntity> captor = ArgumentCaptor.forClass(ExpenseCategoryEntity.class);
        verify(categoryRepository).save(captor.capture());
        ExpenseCategoryEntity saved = captor.getValue();
        assertEquals("日用品", saved.getName());
        assertEquals("OPTIONAL", saved.getNotePolicy());
        assertEquals(50, saved.getSortOrder());
        assertTrue(saved.isActive());
        assertFalse(saved.isSystem());
        assertNull(saved.getI18nKey());
        assertTrue(saved.getCode().matches("CUSTOM_[A-F0-9]{32}"));
        assertEquals("日用品", result.name());
    }

    @Test
    void rejectsDuplicateCategoryName() {
        when(categoryRepository.existsByNameIgnoreCase("日用品")).thenReturn(true);

        FinanceException exception = assertThrows(FinanceException.class,
                () -> service.addCategory(new CategoryRequest("日用品")));

        assertEquals("CATEGORY_NAME_EXISTS", exception.getCode());
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void updatesExpenseAmountCategoryAndNote() {
        ExpenseCategoryEntity oldCategory = category("MEAL", "正餐", "OPTIONAL");
        ExpenseCategoryEntity newCategory = category("COMMUTE", "通勤", "OPTIONAL");
        ExpenseEntity expense = new ExpenseEntity();
        expense.setExpenseDate(LocalDate.of(2026, 11, 17));
        expense.setAmountCents(2000);
        expense.setCategory(oldCategory);
        expense.setNote("午饭");
        expense.setOccurredAt(LocalDateTime.of(2026, 11, 17, 12, 0));

        when(expenseRepository.findById(8L)).thenReturn(Optional.of(expense));
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(newCategory));
        when(expenseRepository.saveAndFlush(expense)).thenReturn(expense);
        when(expenseRepository.sumAmountByDate(expense.getExpenseDate())).thenReturn(3500L);
        when(budgetRepository.findByBudgetDate(expense.getExpenseDate())).thenReturn(Optional.empty());

        var response = service.updateExpense(8L, new ExpenseUpdateRequest(2500, 2L, "  地铁  "));

        assertEquals(2500, expense.getAmountCents());
        assertEquals(newCategory, expense.getCategory());
        assertEquals("地铁", expense.getNote());
        assertEquals(3500, response.totalAmountCents());
        assertEquals("COMMUTE", response.expense().categoryCode());
        verify(expenseRepository).saveAndFlush(expense);
    }

    @Test
    void rejectsUpdatingMissingExpense() {
        when(expenseRepository.findById(99L)).thenReturn(Optional.empty());

        FinanceException exception = assertThrows(FinanceException.class,
                () -> service.updateExpense(99L, new ExpenseUpdateRequest(1000, 1L, null)));

        assertEquals("EXPENSE_NOT_FOUND", exception.getCode());
        verify(categoryRepository, never()).findById(any());
    }

    private ExpenseCategoryEntity category(String code, String name, String notePolicy) {
        ExpenseCategoryEntity category = new ExpenseCategoryEntity();
        category.setCode(code);
        category.setName(name);
        category.setNotePolicy(notePolicy);
        category.setActive(true);
        return category;
    }
}
