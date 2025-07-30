/**
 * Formatting utilities for YNAB data
 */

/**
 * Format balance from milliunits to dollars
 */
export const formatBalance = (balance: number): string => {
  return (balance / 1000).toFixed(2);
};

/**
 * Format amount from milliunits to dollars with sign
 */
export const formatAmount = (amount: number): string => {
  const value = amount / 1000;
  return value >= 0 ? `+$${value.toFixed(2)}` : `-$${Math.abs(value).toFixed(2)}`;
};

/**
 * Format amount without sign prefix
 */
export const formatAmountSimple = (amount: number): string => {
  return (amount / 1000).toFixed(2);
};

/**
 * Format date to readable string
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format month string to display format
 */
export const formatMonthDisplay = (monthStr: string): string => {
  const date = new Date(monthStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Get account type display name
 */
export const getAccountTypeDisplay = (type: string): string => {
  const typeMap: Record<string, string> = {
    checking: 'Checking',
    savings: 'Savings',
    creditCard: 'Credit Card',
    cash: 'Cash',
    lineOfCredit: 'Line of Credit',
    otherAsset: 'Other Asset',
    otherLiability: 'Other Liability',
    mortgage: 'Mortgage',
    autoLoan: 'Auto Loan',
    studentLoan: 'Student Loan',
    personalLoan: 'Personal Loan',
    medicalDebt: 'Medical Debt',
    otherDebt: 'Other Debt'
  };
  return typeMap[type] || type;
};

/**
 * Get goal type display name
 */
export const getGoalTypeDisplay = (goalType: string | null): string => {
  if (!goalType) return 'None';
  const goalMap: Record<string, string> = {
    'TB': 'Target Category Balance',
    'TBD': 'Target Category Balance by Date', 
    'MF': 'Monthly Funding',
    'NEED': 'Plan Your Spending'
  };
  return goalMap[goalType] || goalType;
};

/**
 * Get flag emoji for transaction flag color
 */
export const getFlagEmoji = (color: string | null): string => {
  if (!color) return '';
  const flagMap: Record<string, string> = {
    red: '🚩',
    orange: '🟠',
    yellow: '🟡',
    green: '🟢',
    blue: '🔵',
    purple: '🟣'
  };
  return flagMap[color] || '';
};

/**
 * Format transaction status
 */
export const formatStatus = (clearedStatus: string, approvedStatus: boolean): string => {
  const clearedText = clearedStatus.charAt(0).toUpperCase() + clearedStatus.slice(1);
  const approvedText = approvedStatus ? '✓ Approved' : '⚠️ Unapproved';
  return `${clearedText}, ${approvedText}`;
};

/**
 * Get status emoji based on cleared and approved status
 */
export const getStatusEmoji = (clearedStatus: string, approvedStatus: boolean): string => {
  if (clearedStatus === 'reconciled') return '✅';
  if (clearedStatus === 'cleared') return '☑️';
  if (!approvedStatus) return '⏳';
  return '📝';
};

/**
 * Get confidence emoji for matching
 */
export const getConfidenceEmoji = (confidence: string): string => {
  switch (confidence) {
    case 'high': return '🟢';
    case 'medium': return '🟡';
    case 'low': return '🔴';
    default: return '⚪';
  }
};

/**
 * Get urgency emoji for reconciliation
 */
export const getUrgencyEmoji = (daysOld: number): string => {
  if (daysOld > 30) return '🔴';
  if (daysOld > 14) return '🟠';
  if (daysOld > 7) return '🟡';
  return '🟢';
}; 