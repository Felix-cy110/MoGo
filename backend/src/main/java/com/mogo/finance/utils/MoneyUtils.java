package com.mogo.finance.utils;

public final class MoneyUtils {
    private MoneyUtils() {}

    public static int usagePercent(long totalCents, long budgetCents) {
        if (budgetCents <= 0) return 0;
        return (int) Math.min(Integer.MAX_VALUE, Math.floor(totalCents * 100.0 / budgetCents));
    }

    public static boolean reachedThreshold(long totalCents, long budgetCents, int thresholdPercent) {
        return totalCents * 100L >= budgetCents * (long) thresholdPercent;
    }
}
