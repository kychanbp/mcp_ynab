/**
 * Shared constants for YNAB MCP server
 */

export const SERVER_NAME = "ynab-mcp-server";
export const SERVER_VERSION = "1.0.0";

export const MILLIUNITS_DIVISOR = 1000;

export const TRANSACTION_CLEARED_STATUS = {
  CLEARED: 'cleared',
  UNCLEARED: 'uncleared',
  RECONCILED: 'reconciled'
} as const;

export const FLAG_COLORS = {
  RED: 'red',
  ORANGE: 'orange',
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  PURPLE: 'purple'
} as const;

export const GOAL_TYPES = {
  TB: 'TB',        // Target Category Balance
  TBD: 'TBD',      // Target Category Balance by Date
  MF: 'MF',        // Monthly Funding
  NEED: 'NEED'     // Plan Your Spending
} as const;

export const ACCOUNT_TYPES = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'creditCard',
  CASH: 'cash',
  LINE_OF_CREDIT: 'lineOfCredit',
  OTHER_ASSET: 'otherAsset',
  OTHER_LIABILITY: 'otherLiability',
  MORTGAGE: 'mortgage',
  AUTO_LOAN: 'autoLoan',
  STUDENT_LOAN: 'studentLoan',
  PERSONAL_LOAN: 'personalLoan',
  MEDICAL_DEBT: 'medicalDebt',
  OTHER_DEBT: 'otherDebt'
} as const; 