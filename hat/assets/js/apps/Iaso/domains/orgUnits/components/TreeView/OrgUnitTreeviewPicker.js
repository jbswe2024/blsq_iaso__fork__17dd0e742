import React, { useState } from 'react';
import { func, any, bool, object, oneOfType, string } from 'prop-types';
import classnames from 'classnames';
import { Paper, InputLabel, Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
    FormControl,
    IconButton,
    useSafeIntl,
    TruncatedTreeview,
} from 'bluesquare-components';
import { MESSAGES } from './messages';
import { baseUrls } from '../../../../constants/urls';

const styles = theme => ({
    placeholder: {
        alignItems: 'center',
        fontSize: '16px',
        flex: '1',
        marginLeft: '14px',
        cursor: 'default',
        color: 'transparent',
    },
    treeviews: {
        alignItems: 'center',
        fontSize: '16px',
        flex: '1',
        marginLeft: '10px',
    },
    paper: {
        display: 'flex',
        alignItems: 'center',
        border: '1px solid rgba(0,0,0,0.23)', // aligning with AutoSelect
        paddingTop: 12,
        paddingBottom: 12,
        paddingRight: theme.spacing(2),
    },
    inputLabel: {
        backgroundColor: 'white',
        color: theme.palette.mediumGray.main,
    },
    enabled: {
        '&:hover': {
            border: '1px solid rgba(0,0,0,0.87)', // aligning with AutoSelect
        },
    },
    pointer: { cursor: 'pointer' },
    clearButton: {
        marginRight: 5,
    },
    error: {
        '&:hover': { border: `1px solid ${theme.palette.error.main}` },
        border: `1px solid ${theme.palette.error.main}`,
    },
    errorLabel: {
        color: theme.palette.error.main,
    },
});
const formatPlaceholder = (placeholder, formatMessage) => {
    if (!placeholder) return null;
    if (typeof placeholder === 'string') return placeholder;
    return formatMessage(placeholder);
};

const noOp = () => null;

const useStyles = makeStyles(styles);
const OrgUnitTreeviewPicker = ({
    onClick,
    selectedItems,
    resetSelection,
    multiselect,
    placeholder,
    required,
    disabled,
    label,
    clearable,
    enableErrors,
    errorMessage,
}) => {
    const intl = useSafeIntl();
    const classes = useStyles();
    const { formatMessage } = intl;
    const defaultErrorMessaege = formatMessage(MESSAGES.error);

    const [isReset, setIsReset] = useState(false);
    const isError = isReset && selectedItems.size === 0;
    const showError = enableErrors && isError;

    const errorStyle = showError && !disabled ? classes.error : '';
    const errorLabelStyle = showError && !disabled ? classes.errorLabel : '';

    const enabledStyle = disabled ? '' : classes.enabled;

    const placeholderStyle = disabled
        ? classes.placeholder
        : `${classes.placeholder} ${classes.pointer}`;

    const formattedPlaceholder =
        formatPlaceholder(placeholder, intl.formatMessage) ??
        (multiselect
            ? intl.formatMessage(MESSAGES.selectMultiple)
            : intl.formatMessage(MESSAGES.selectSingle));

    const makeTruncatedTrees = treesData => {
        if (treesData.size === 0)
            return (
                <div
                    role="button"
                    tabIndex="0"
                    onClick={disabled ? noOp : onClick}
                    className={placeholderStyle}
                >
                    {formattedPlaceholder}
                </div>
            );
        const treeviews = [];
        treesData.forEach((value, key) => {
            const treeview = (
                <TruncatedTreeview
                    onClick={disabled ? noOp : onClick}
                    selectedItems={value}
                    key={`TruncatedTree${key.toString()}`}
                    label={label}
                    redirect={id =>
                        window.open(
                            `/dashboard/${baseUrls.orgUnitDetails}/orgUnitId/${id}`,
                            '_blank',
                        )
                    }
                />
            );
            treeviews.push(treeview);
        });
        return <div className={classes.treeviews}>{treeviews}</div>;
    };
    return (
        <Box mt={1}>
            <FormControl>
                <InputLabel
                    shrink={selectedItems.size > 0}
                    required={required}
                    className={`${classnames(
                        classes.inputLabel,
                        'input-label',
                    )} ${errorLabelStyle}`}
                >
                    {formattedPlaceholder}
                </InputLabel>
                <Paper
                    variant="outlined"
                    elevation={0}
                    className={`${classes.paper} ${enabledStyle} ${errorStyle}`}
                >
                    {makeTruncatedTrees(selectedItems)}
                    {clearable && resetSelection && selectedItems.size > 0 && (
                        <Box
                            className={classnames(
                                classes.clearButton,
                                'clear-tree',
                            )}
                        >
                            <IconButton
                                icon="clear"
                                size="small"
                                tooltipMessage={MESSAGES.clear}
                                onClick={() => {
                                    setIsReset(true);
                                    resetSelection();
                                }}
                            />
                        </Box>
                    )}
                    <IconButton
                        size="small"
                        tooltipMessage={
                            multiselect
                                ? MESSAGES.selectMultiple
                                : MESSAGES.selectSingle
                        }
                        icon="orgUnit"
                        onClick={onClick}
                    />
                </Paper>
                {enableErrors && showError && (
                    <Typography variant="body1" className={classes.errorLabel}>
                        {errorMessage ?? defaultErrorMessaege}
                    </Typography>
                )}
            </FormControl>
        </Box>
    );
};

OrgUnitTreeviewPicker.propTypes = {
    onClick: func.isRequired,
    // map with other maps as values: {id:{id:name}}
    selectedItems: any,
    resetSelection: func,
    multiselect: bool,
    placeholder: oneOfType([object, string]),
    required: bool,
    disabled: bool,
    label: func.isRequired,
    clearable: bool,
    enableErrors: bool,
    errorMessage: string,
};
OrgUnitTreeviewPicker.defaultProps = {
    selectedItems: [],
    resetSelection: null,
    multiselect: false,
    placeholder: null,
    required: false,
    disabled: false,
    clearable: true,
    enableErrors: false,
    errorMessage: null,
};

export { OrgUnitTreeviewPicker };
