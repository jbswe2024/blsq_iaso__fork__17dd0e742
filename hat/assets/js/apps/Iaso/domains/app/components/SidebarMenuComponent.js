import React, { useContext } from 'react';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';

import ExitIcon from '@material-ui/icons/ExitToApp';
import {
    withStyles,
    Box,
    Button,
    IconButton,
    Drawer,
    List,
    Divider,
    Typography,
    Tooltip,
} from '@material-ui/core';

import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import PropTypes from 'prop-types';

import { injectIntl, commonStyles } from 'bluesquare-components';
import { toggleSidebarMenu } from '../../../redux/sidebarMenuReducer';
import { SIDEBAR_WIDTH } from '../../../constants/uiConstants';

import MenuItem from './MenuItemComponent';
import LogoSvg from './LogoSvgComponent';
import LanguageSwitch from './LanguageSwitchComponent';

import getMenuItems from '../../../constants/menu';

import MESSAGES from './messages';

import { listMenuPermission, userHasOneOfPermissions } from '../../users/utils';
import { getDefaultSourceVersion } from '../../dataSources/utils';
import { PluginsContext } from '../../../utils';

const styles = theme => ({
    ...commonStyles(theme),
    logo: {
        height: 35,
        width: 90,
    },
    toolbar: {
        ...theme.mixins.toolbar,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: theme.spacing(3),
        paddingRight: theme.spacing(3),
        height: 90,
    },
    menuButton: {
        marginLeft: 'auto',
    },
    list: {
        width: SIDEBAR_WIDTH,
    },
    user: {
        marginTop: 'auto',
        marginBottom: theme.spacing(3),
        marginLeft: theme.spacing(3),
        marginRight: theme.spacing(3),
    },
    userName: {
        margin: theme.spacing(1),
    },
    userManual: {
        cursor: 'pointer',
    },
    link: {
        textDecoration: 'none',
        color: 'inherit',
    },
});

const localizedManualUrl = (locale, account) => {
    if (locale === 'fr' && account === 'RDC') {
        return 'https://docs.google.com/document/d/1lKyhbKDLZpHtAsf3K6pRs0_EAXWdSDsL76Ohv0cyZQc/edit';
    }
    return 'https://docs.google.com/document/d/1qHCRIiYgbZYAKMqxXYOjBGL_nzlSDPhOLykiKXaw8fw/edit';
};

const SidebarMenu = ({
    classes,
    isOpen,
    toggleSidebar,
    location,
    currentUser,
    intl,
    activeLocale,
}) => {
    const onClick = () => {
        toggleSidebar();
    };
    const { plugins } = useContext(PluginsContext);
    const defaultSourceVersion = getDefaultSourceVersion(currentUser);
    const menuItems = getMenuItems(currentUser, plugins, defaultSourceVersion);
    return (
        <Drawer anchor="left" open={isOpen} onClose={toggleSidebar}>
            <div className={classes.toolbar}>
                <LogoSvg className={classes.logo} />
                <IconButton
                    className={classes.menuButton}
                    color="inherit"
                    aria-label="Menu"
                    onClick={toggleSidebar}
                >
                    <ArrowForwardIcon />
                </IconButton>
            </div>
            <Divider />
            <List className={classes.list}>
                {menuItems.map(menuItem => {
                    const permissionsList = listMenuPermission(menuItem);
                    if (userHasOneOfPermissions(permissionsList, currentUser)) {
                        return (
                            <MenuItem
                                location={location}
                                key={menuItem.key}
                                menuItem={menuItem}
                                onClick={path => onClick(path)}
                                currentUser={currentUser}
                            />
                        );
                    }
                    return null;
                })}
            </List>
            <Box className={classes.user}>
                <LanguageSwitch />
                <Typography
                    variant="body2"
                    color="textSecondary"
                    className={classes.userName}
                >
                    {currentUser.user_name}
                </Typography>
                {currentUser.account && (
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        className={classes.userName}
                    >
                        {defaultSourceVersion && (
                            <Tooltip
                                classes={{ popper: classes.popperFixed }}
                                placement="bottom"
                                title={`${intl.formatMessage(
                                    MESSAGES.source,
                                )}: ${
                                    (defaultSourceVersion.source &&
                                        defaultSourceVersion.source.name) ||
                                    '-'
                                }, ${intl.formatMessage(MESSAGES.version)} ${
                                    (defaultSourceVersion.version &&
                                        defaultSourceVersion.version.number) ||
                                    '-'
                                }`}
                            >
                                <span>{currentUser.account.name}</span>
                            </Tooltip>
                        )}
                        {!defaultSourceVersion && (
                            <span>{currentUser.account.name}</span>
                        )}
                    </Typography>
                )}
                <Tooltip
                    classes={{ popper: classes.popperFixed }}
                    placement="bottom-start"
                    title={intl.formatMessage(MESSAGES.viewUserManual)}
                >
                    <Typography
                        variant="body2"
                        color="textSecondary"
                        className={`${classes.userName} ${classes.userManual}`}
                    >
                        <a
                            href={localizedManualUrl(
                                activeLocale.code,
                                currentUser.account.name,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className={classes.link}
                        >
                            {intl.formatMessage(MESSAGES.userManual)}
                        </a>
                    </Typography>
                </Tooltip>
                <Button
                    size="small"
                    color="inherit"
                    href="/logout-iaso"
                    aria-label={<FormattedMessage {...MESSAGES.logout} />}
                >
                    <ExitIcon className={classes.smallButtonIcon} />
                    <FormattedMessage {...MESSAGES.logout} />
                </Button>
            </Box>
        </Drawer>
    );
};

SidebarMenu.propTypes = {
    classes: PropTypes.object.isRequired,
    isOpen: PropTypes.bool.isRequired,
    toggleSidebar: PropTypes.func.isRequired,
    location: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
    intl: PropTypes.object.isRequired,
    activeLocale: PropTypes.object.isRequired,
};

const MapStateToProps = state => ({
    isOpen: state.sidebar.isOpen,
    currentUser: state.users.current,
    activeLocale: state.app.locale,
});

const MapDispatchToProps = dispatch => ({
    toggleSidebar: () => dispatch(toggleSidebarMenu()),
});

export default withStyles(styles)(
    connect(MapStateToProps, MapDispatchToProps)(injectIntl(SidebarMenu)),
);
