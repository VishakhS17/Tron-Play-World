import { getSevenDaysFromToday } from '@/utils/dateUtils';
import { useEffect, useState } from 'react';
import TimeDisplay from './TimeDisplay';

export interface TimeState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const CountdownTimer = () => {
  const [date, setDate] = useState<TimeState>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const getTime = () => {
    const time = Date.parse(getSevenDaysFromToday()) - Date.now();

    setDate({
      days: Math.floor(time / (1000 * 60 * 60 * 24)),
      hours: Math.floor((time / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((time / 1000 / 60) % 60),
      seconds: Math.floor((time / 1000) % 60),
    });
  };

  useEffect(() => {
    const interval = setInterval(getTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap gap-6 mt-6">
      <TimeDisplay value={date.days} label="Days" />
      <TimeDisplay value={date.hours} label="Hours" />
      <TimeDisplay value={date.minutes} label="Minutes" />
      <TimeDisplay value={date.seconds} label="Seconds" />
    </div>
  );
}; 