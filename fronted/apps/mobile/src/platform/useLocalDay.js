import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { formatLocalDate } from '@mogo/personal-finance-core';
export default function useLocalDay() {
  const [date, setDate] = useState(formatLocalDate);
  useEffect(() => {
    const update = () => setDate(formatLocalDate());
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    const timer = setInterval(update, 30_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);
  return date;
}
