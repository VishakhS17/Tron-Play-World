// utils/formatDateString.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

/**
 * Formats a UTC date string consistently across server and client
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateString(dateInput: Date | string) {
  return dayjs.utc(dateInput).format("MMMM D, YYYY h:mm A");
}
