package com.mogo.finance.entity;

public record ExpenseCategoryView(Long id, String code, String name, String i18nKey,
                                  String notePolicy, boolean system, int sortOrder) {}
