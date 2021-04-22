import MESSAGES from './messages';

export const PERIOD_TYPE_YEAR = 'YEAR';
export const PERIOD_TYPE_SIX_MONTH = 'SIX_MONTH';
export const PERIOD_TYPE_QUARTER = 'QUARTER';
export const PERIOD_TYPE_MONTH = 'MONTH';

export const PERIOD_TYPES = [
    PERIOD_TYPE_MONTH,
    PERIOD_TYPE_QUARTER,
    PERIOD_TYPE_SIX_MONTH,
    PERIOD_TYPE_YEAR,
];

export const periodTypeOptions = [
    PERIOD_TYPE_MONTH,
    PERIOD_TYPE_QUARTER,
    PERIOD_TYPE_YEAR,
].map(periodType => ({
    value: periodType,
    label: MESSAGES[periodType.toLowerCase()],
}));

export const QUARTERS = {
    1: 'Q1',
    2: 'Q2',
    3: 'Q3',
    4: 'Q4',
};
export const SEMESTERS = {
    1: 'S1',
    2: 'S2',
};
export const MONTHS = {
    1: MESSAGES.january,
    2: MESSAGES.february,
    3: MESSAGES.march,
    4: MESSAGES.april,
    5: MESSAGES.may,
    6: MESSAGES.june,
    7: MESSAGES.july,
    8: MESSAGES.august,
    9: MESSAGES.september,
    10: MESSAGES.october,
    11: MESSAGES.november,
    12: MESSAGES.december,
};
