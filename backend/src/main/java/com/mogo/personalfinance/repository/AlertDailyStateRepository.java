package com.mogo.personalfinance.repository;

import com.mogo.personalfinance.entity.AlertDailyStateEntity;
import com.mogo.personalfinance.entity.AlertDailyStateId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertDailyStateRepository extends JpaRepository<AlertDailyStateEntity, AlertDailyStateId> {}
