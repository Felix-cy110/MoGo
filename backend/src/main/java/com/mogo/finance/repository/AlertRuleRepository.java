package com.mogo.finance.repository;

import com.mogo.finance.entity.AlertRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AlertRuleRepository extends JpaRepository<AlertRuleEntity, Long> {
    List<AlertRuleEntity> findByActiveTrueOrderByThresholdPercentAsc();
    Optional<AlertRuleEntity> findByCode(String code);
}
