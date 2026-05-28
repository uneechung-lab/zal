function getMonthWeekdays(year, month) {
  const date = new Date(year, month - 1, 1);
  let count = 0;
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

const year = 2026;
const month = 5;
const days = getMonthWeekdays(year, month);
console.log(`Year: ${year}, Month: ${month}, Weekdays: ${days}`);
console.log(`Limit: ${days * 10000} KRW`);
