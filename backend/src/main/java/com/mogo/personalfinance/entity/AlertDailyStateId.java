package com.mogo.personalfinance.entity;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

public class AlertDailyStateId implements Serializable {
    private LocalDate budgetDate;
    private Long ruleId;

    public AlertDailyStateId() {}
    public AlertDailyStateId(LocalDate budgetDate, Long ruleId) {
        this.budgetDate = budgetDate;
        this.ruleId = ruleId;
    }
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AlertDailyStateId that)) return false;
        return Objects.equals(budgetDate, that.budgetDate) && Objects.equals(ruleId, that.ruleId);
    }
    @Override public int hashCode() { return Objects.hash(budgetDate, ruleId); }
}
