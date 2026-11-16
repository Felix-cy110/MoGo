package com.mogo.personalfinance;

import com.mogo.personalfinance.utils.MoneyUtils;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MoneyUtilsTest {
    @Test
    void reachesThresholdAtExactBoundary() {
        assertTrue(MoneyUtils.reachedThreshold(8_000, 10_000, 80));
        assertFalse(MoneyUtils.reachedThreshold(7_999, 10_000, 80));
    }

    @Test
    void usagePercentDoesNotRoundUpBeforeThreshold() {
        assertEquals(79, MoneyUtils.usagePercent(7_999, 10_000));
        assertEquals(80, MoneyUtils.usagePercent(8_000, 10_000));
        assertEquals(0, MoneyUtils.usagePercent(0, 0));
    }
}
