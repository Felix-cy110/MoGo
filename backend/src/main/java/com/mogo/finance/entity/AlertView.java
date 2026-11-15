package com.mogo.finance.entity;

public record AlertView(String code, String severity, int thresholdPercent,
                        String messageKey, long totalAmountCents, long budgetAmountCents) {}
