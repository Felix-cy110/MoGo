package com.mogo.personalfinance.entity;

import java.time.LocalDateTime;

public record ExpenseView(Long id, String expenseDate, long amountCents,
                          Long categoryId, String categoryCode, String categoryName,
                          String note, LocalDateTime occurredAt) {}
