import React from 'react';
import { FeaturePlanningScreen } from '../../components/FeaturePlanningScreen';

export function LeetCodeInterviewScreen({ onBack, onOpenSettings }) {
  return (
    <FeaturePlanningScreen
      titleKey="leetcodeInterviewTitle"
      descriptionKey="leetcodeInterviewPlanning"
      backKey="leetcodeInterviewBack"
      onBack={onBack}
      onOpenSettings={onOpenSettings}
    />
  );
}
