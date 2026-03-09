export function getSevenDaysFromToday() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
} 