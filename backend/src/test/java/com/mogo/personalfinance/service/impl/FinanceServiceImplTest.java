package com.mogo.personalfinance.service.impl;

import com.mogo.personalfinance.entity.ApiModels.CategoryRequest;
import com.mogo.personalfinance.entity.ExpenseCategoryEntity;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FinanceServiceImplTest {
    private ExpenseCategoryRepository categoryRepository;
    private FinanceServiceImpl service;

    @BeforeEach
    void setUp() {
        categoryRepository = mock(ExpenseCategoryRepository.class);
        service = new FinanceServiceImpl(
                categoryRepository,
                mock(DailyBudgetRepository.class),
                mock(ExpenseRepository.class),
                mock(AlertRuleRepository.class),
                mock(AlertDailyStateRepository.class),
                mock(AlertEventRepository.class)
        );
    }

    @Test
    void addsTrimmedCustomCategoryAfterDefaultCategories() {
        when(categoryRepository.existsByNameIgnoreCase("日用品")).thenReturn(false);
        when(categoryRepository.findMaxSortOrder()).thenReturn(40);
        when(categoryRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

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
        verify(categoryRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
