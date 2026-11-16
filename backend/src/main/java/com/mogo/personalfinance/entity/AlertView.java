package com.mogo.personalfinance.entity;

public record AlertView(String code, String severity, int thresholdPercent,
                        String messageKey, long totalAmountCents, long budgetAmountCents) {}
