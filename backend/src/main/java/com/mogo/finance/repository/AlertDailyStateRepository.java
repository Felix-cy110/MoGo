package com.mogo.finance.repository;

import com.mogo.finance.entity.AlertDailyStateEntity;
import com.mogo.finance.entity.AlertDailyStateId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertDailyStateRepository extends JpaRepository<AlertDailyStateEntity, AlertDailyStateId> {}
