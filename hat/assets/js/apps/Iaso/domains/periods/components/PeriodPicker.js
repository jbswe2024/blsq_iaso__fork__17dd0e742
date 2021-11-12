import React, { useState } from 'react';
import { Grid, makeStyles, Box, Typography } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import PropTypes from 'prop-types';

import { DatePicker, useSafeIntl, commonStyles } from 'bluesquare-components';
import InputComponent from '../../../components/forms/InputComponent';

import { getYears } from '../../../utils';
import { getPeriodPickerString } from '../utils';
import { Period } from '../models';

import {
    PERIOD_TYPE_DAY,
    PERIOD_TYPE_MONTH,
    PERIOD_TYPE_QUARTER,
    PERIOD_TYPE_SIX_MONTH,
    PERIOD_TYPE_YEAR,
    MONTHS,
    QUARTERS,
    QUARTERS_RANGE,
    SEMESTERS,
    SEMESTERS_RANGE,
} from '../constants';
import MESSAGES from '../messages';

const useStyles = makeStyles(theme => ({
    ...commonStyles(theme),
    title: {
        fontSize: 17,
        marginBottom: 3,
    },
}));

const PeriodPicker = ({
    periodType,
    title,
    onChange,
    activePeriodString,
    hasError,
}) => {
    const classes = useStyles();
    const theme = useTheme();
    const { formatMessage } = useSafeIntl();
    const [currentPeriod, setCurrentPeriod] = useState(
        activePeriodString && Period.getPeriodType(activePeriodString)
            ? Period.parse(activePeriodString)[1]
            : null,
    );

    const handleChange = (keyName, value) => {
        const newPeriod = {
            ...currentPeriod,
            [keyName]: value,
        };
        setCurrentPeriod(newPeriod);
        onChange(getPeriodPickerString(periodType, newPeriod, value));
    };

    return (
        <Box
            mt={2}
            p={periodType === PERIOD_TYPE_DAY ? 0 : 1}
            mb={2}
            border={periodType === PERIOD_TYPE_DAY ? 0 : 1}
            borderRadius={5}
            borderColor={
                hasError ? theme.palette.error.main : 'rgba(0,0,0,0.23)'
            }
        >
            {periodType === PERIOD_TYPE_DAY && (
                <DatePicker
                    label={title}
                    clearMessage={MESSAGES.clear}
                    currentDate={activePeriodString}
                    hasError={hasError}
                    onChange={date =>
                        handleChange(
                            'day',
                            date ? date.format('YYYYMMDD') : null,
                        )
                    }
                />
            )}
            {periodType !== PERIOD_TYPE_DAY && (
                <>
                    <Typography variant="h6" className={classes.title}>
                        {title}
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid
                            item
                            sm={periodType === PERIOD_TYPE_YEAR ? 12 : 6}
                        >
                            <InputComponent
                                keyValue="year"
                                onChange={handleChange}
                                clearable
                                value={currentPeriod && currentPeriod.year}
                                type="select"
                                options={getYears(15, 10, true).map(y => ({
                                    label: y.toString(),
                                    value: y.toString(),
                                }))}
                                label={MESSAGES.year}
                            />
                        </Grid>
                        {periodType !== PERIOD_TYPE_YEAR && (
                            <Grid item sm={6}>
                                {periodType === PERIOD_TYPE_MONTH && (
                                    <InputComponent
                                        keyValue="month"
                                        onChange={handleChange}
                                        clearable
                                        value={
                                            currentPeriod && currentPeriod.month
                                        }
                                        type="select"
                                        options={Object.entries(MONTHS).map(
                                            ([value, month]) => ({
                                                label: formatMessage(month),
                                                value,
                                            }),
                                        )}
                                        label={MESSAGES.month}
                                    />
                                )}
                                {periodType === PERIOD_TYPE_QUARTER && (
                                    <InputComponent
                                        keyValue="quarter"
                                        onChange={handleChange}
                                        clearable
                                        value={
                                            currentPeriod &&
                                            currentPeriod.quarter
                                        }
                                        type="select"
                                        options={Object.entries(QUARTERS).map(
                                            ([value, label]) => ({
                                                label: `${label} (${formatMessage(
                                                    QUARTERS_RANGE[value][0],
                                                )}-${formatMessage(
                                                    QUARTERS_RANGE[value][1],
                                                )})`,
                                                value,
                                            }),
                                        )}
                                        label={MESSAGES.quarter}
                                    />
                                )}

                                {periodType === PERIOD_TYPE_SIX_MONTH && (
                                    <InputComponent
                                        keyValue="semester"
                                        onChange={handleChange}
                                        clearable
                                        value={
                                            currentPeriod &&
                                            currentPeriod.semester
                                        }
                                        type="select"
                                        options={Object.entries(SEMESTERS).map(
                                            ([value, label]) => ({
                                                label: `${label} (${formatMessage(
                                                    SEMESTERS_RANGE[value][0],
                                                )}-${formatMessage(
                                                    SEMESTERS_RANGE[value][1],
                                                )})`,
                                                value,
                                            }),
                                        )}
                                        label={MESSAGES.six_month}
                                    />
                                )}
                            </Grid>
                        )}
                    </Grid>
                </>
            )}
        </Box>
    );
};

PeriodPicker.defaultProps = {
    activePeriodString: undefined,
    hasError: false,
};

PeriodPicker.propTypes = {
    periodType: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    activePeriodString: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.object,
    ]),
    hasError: PropTypes.bool,
};

export default PeriodPicker;
