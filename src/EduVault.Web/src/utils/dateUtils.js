/**
 * Central Date Formatting Utility for EduVault System
 * Strictly formats all dates to DD-MM-YYYY format across the entire application.
 */

export const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';

  // If string starts with YYYY-MM-DD
  if (typeof dateInput === 'string') {
    const ymdMatch = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return `${day}-${month}-${year}`;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

export const formatDateRangeDDMMYYYY = (startDate, endDate) => {
  const startFormatted = formatDateDDMMYYYY(startDate);
  if (!endDate || endDate === startDate) return startFormatted;
  const endFormatted = formatDateDDMMYYYY(endDate);
  return `${startFormatted} to ${endFormatted}`;
};

export const formatDateTimeDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `${day}-${month}-${year} ${timeStr}`;
};

/**
 * Returns today's date as a YYYY-MM-DD string (for input[type=date] values).
 * Centralized here to avoid 10+ copies across the codebase.
 */
export const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
