import React from 'react';
import { FeaturePlanningScreen } from '../../components/FeaturePlanningScreen';

export function InvestmentManagementScreen({ onBack, onOpenSettings }) {
  return (
    <FeaturePlanningScreen
      titleKey="investmentManagementTitle"
      descriptionKey="investmentManagementPlanning"
      backKey="investmentManagementBack"
      onBack={onBack}
      onOpenSettings={onOpenSettings}
    />
  );
}
