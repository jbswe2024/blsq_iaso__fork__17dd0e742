import React, { useState, useEffect } from 'react';
import { makeStyles, Grid, Box } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';

import PropTypes from 'prop-types';

import {
    commonStyles,
    LoadingSpinner,
    AddButton as AddButtonComponent,
    useSafeIntl,
} from 'bluesquare-components';
import {
    resetInstances,
    setInstances,
    setInstancesFetching,
    createInstance,
} from './actions';
import { redirectToReplace } from '../../routing/actions';
import { fetchFormDetailsForInstance, fetchPossibleFields } from './requests';
import {
    fetchInstancesAsDict,
    fetchInstancesAsSmallDict,
} from '../../utils/requests';

import {
    getInstancesFilesList,
    getSelectionActions,
    getFilters,
    getEndpointUrl,
} from './utils';

import { TopBar } from './components/TopBar';
import DownloadButtonsComponent from '../../components/DownloadButtonsComponent';
import InstancesMap from './components/InstancesMapComponent';
import InstancesFilesList from './components/InstancesFilesListComponent';
import InstancesFiltersComponent from './components/InstancesFiltersComponent';
import CreateReAssignDialogComponent from './components/CreateReAssignDialogComponent';
import SingleTable from '../../components/tables/SingleTable';

import { baseUrls } from '../../constants/urls';

import MESSAGES from './messages';

const baseUrl = baseUrls.instances;

const useStyles = makeStyles(theme => ({
    ...commonStyles(theme),
    selectColmunsContainer: {
        paddingRight: theme.spacing(4),
        position: 'relative',
        top: -theme.spacing(2),
    },
}));

const Instances = ({ router, params }) => {
    const classes = useStyles();
    const { formatMessage } = useSafeIntl();
    const dispatch = useDispatch();

    const reduxPage = useSelector(state => state.instances.instancesPage);
    const loadingList = useSelector(state => state.instances.fetching);

    const [tableColumns, setTableColumns] = useState([]);
    const [tab, setTab] = useState(params.tab ?? 'list');
    const [loadingMap, setLoadingMap] = useState(tab === 'map');
    const [forceRefresh, setForceRefresh] = useState(false);
    const [instancesSmall, setInstancesSmall] = useState(null);
    const [labelKeys, setLabelKeys] = useState([]);
    const [formName, setFormName] = useState('');
    const [possibleFields, setPossibleFields] = useState(null);
    const [periodType, setPeriodType] = useState(null);

    const fetchSmallInstances = (queryParams = params) => {
        const urlSmall = getEndpointUrl(queryParams, false, '', true);
        setLoadingMap(true);
        return fetchInstancesAsSmallDict(dispatch, urlSmall).then(
            smallInstancesData => {
                setInstancesSmall(smallInstancesData || []);
                setLoadingMap(false);
            },
        );
    };

    const fetchInstances = (changeLoad = true, queryParams = params) => {
        const url = getEndpointUrl(queryParams);
        if (changeLoad) {
            dispatch(setInstancesFetching(true));
        }
        return fetchInstancesAsDict(dispatch, url).then(instancesData => {
            if (changeLoad) {
                dispatch(setInstancesFetching(false));
            }
            dispatch(
                setInstances(
                    instancesData.instances,
                    queryParams,
                    instancesData.count,
                    instancesData.pages,
                ),
            );
            return {
                list: instancesData.instances,
                count: instancesData.count,
                pages: instancesData.pages,
            };
        });
    };

    const handleChangeTab = newTab => {
        const newParams = {
            ...params,
            tab: newTab,
        };
        if (newTab === 'map' && !instancesSmall) {
            fetchSmallInstances(params);
        }
        dispatch(redirectToReplace(baseUrl, newParams));
        setTab(newTab);
    };

    const onSearch = newParams => {
        dispatch(redirectToReplace(baseUrl, newParams));
    };

    useEffect(() => {
        dispatch(resetInstances);
        fetchInstances();
        if (params.tab === 'map') {
            fetchSmallInstances(params);
        } else {
            setInstancesSmall(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        params.pageSize,
        params.formId,
        params.order,
        params.page,
        params.withLocation,
        params.showDeleted,
        params.orgUnitTypeId,
        params.periods,
        params.status,
        params.deviceId,
        params.deviceOwnershipId,
        params.search,
        params.levels,
        params.dateFrom,
        params.dateTo,
    ]);

    useEffect(() => {
        const onLoad = async () => {
            const formDetails = await fetchFormDetailsForInstance(
                params.formId,
            );
            const newPossibleFields = await fetchPossibleFields(params.formId);
            setLabelKeys(formDetails.label_keys ?? []);
            setFormName(formDetails.name);
            setPeriodType(formDetails.period_type);
            setPossibleFields(newPossibleFields);
        };
        onLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const fetching = loadingMap || loadingList;
    return (
        <section className={classes.relativeContainer}>
            <TopBar
                formName={formName}
                router={router}
                tab={tab}
                handleChangeTab={newTab => handleChangeTab(newTab)}
                params={params}
                periodType={periodType}
                setTableColumns={newCols => setTableColumns(newCols)}
                tableColumns={tableColumns}
                baseUrl={baseUrl}
                labelKeys={labelKeys}
                possibleFields={possibleFields}
            />

            {fetching && <LoadingSpinner />}
            <Box className={classes.containerFullHeightPadded}>
                <InstancesFiltersComponent
                    baseUrl={baseUrl}
                    params={params}
                    onSearch={onSearch}
                />
                {tab === 'list' && (
                    <Grid
                        container
                        spacing={0}
                        alignItems="center"
                        className={classes.marginTop}
                    >
                        <Grid xs={12} item className={classes.textAlignRight}>
                            <div className={classes.paddingBottomBig}>
                                <CreateReAssignDialogComponent
                                    titleMessage={
                                        MESSAGES.instanceCreationDialogTitle
                                    }
                                    confirmMessage={
                                        MESSAGES.instanceCreateAction
                                    }
                                    formType={{
                                        periodType,
                                        id: params.formId,
                                    }}
                                    onCreateOrReAssign={(
                                        currentForm,
                                        payload,
                                    ) =>
                                        dispatch(
                                            createInstance(
                                                currentForm,
                                                payload,
                                            ),
                                        )
                                    }
                                    renderTrigger={({ openDialog }) => (
                                        <AddButtonComponent
                                            onClick={openDialog}
                                        />
                                    )}
                                />
                                <DownloadButtonsComponent
                                    csvUrl={getEndpointUrl(params, true, 'csv')}
                                    xlsxUrl={getEndpointUrl(
                                        params,
                                        true,
                                        'xlsx',
                                    )}
                                />
                            </div>
                        </Grid>
                    </Grid>
                )}
                {tab === 'list' && tableColumns.length > 0 && (
                    <SingleTable
                        forceRefresh={forceRefresh}
                        onForceRefreshDone={() => setForceRefresh(false)}
                        apiParams={{
                            ...params,
                        }}
                        setIsLoading={false}
                        baseUrl={baseUrl}
                        results={reduxPage}
                        endPointPath="instances"
                        dataKey="list"
                        columns={tableColumns}
                        defaultPageSize={20}
                        hideGpkg
                        exportButtons={false}
                        isFullHeight={false}
                        multiSelect
                        selectionActions={getSelectionActions(
                            formatMessage,
                            getFilters(params),
                            () => setForceRefresh(true),
                            params.showDeleted === 'true',
                            classes,
                        )}
                    />
                )}
                {tab === 'map' && (
                    <div className={classes.containerMarginNeg}>
                        <InstancesMap
                            instances={instancesSmall || []}
                            fetching={loadingMap}
                        />
                    </div>
                )}
                {tab === 'files' && (
                    <InstancesFilesList
                        files={getInstancesFilesList(instancesSmall || [])}
                    />
                )}
            </Box>
        </section>
    );
};

Instances.propTypes = {
    params: PropTypes.object.isRequired,
    router: PropTypes.object.isRequired,
};

export default Instances;
