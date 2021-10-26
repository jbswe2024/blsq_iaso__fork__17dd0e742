import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Grid, Typography } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';

import { LoadingSpinner, useSafeIntl } from 'bluesquare-components';
import { merge } from 'lodash';
import { useMutation } from 'react-query';
import { FormattedMessage } from 'react-intl';
import {
    createDataSource,
    updateDataSource,
    updateDefaultSource,
} from '../../../utils/requests';
import ConfirmCancelDialogComponent from '../../../components/dialogs/ConfirmCancelDialogComponent';
import InputComponent from '../../../components/forms/InputComponent';
import { enqueueSnackbar } from '../../../redux/snackBarsReducer';
import { succesfullSnackBar } from '../../../constants/snackBars';

import { fetchCurrentUser } from '../../users/actions';
import MESSAGES from '../messages';
import { commaSeparatedIdsToArray } from '../../../utils/forms';
import { useFormState } from '../../../hooks/form';
import { postRequest } from '../../../libs/Api';

// This wrapper to import translations to project_ids
const ProjectSelectorIds = ({ keyValue, value, onChange, errors, label }) => {
    const { formatMessage } = useSafeIntl();
    const projects = useSelector(state => state.projects.allProjects ?? []);
    const allErrors = [...errors];
    if (value.length === 0) {
        allErrors.unshift(formatMessage(MESSAGES.emptyProjectsError));
    }
    return (
        <InputComponent
            keyValue={keyValue}
            value={value}
            onChange={(key, newValue) =>
                onChange(key, commaSeparatedIdsToArray(newValue))
            }
            errors={allErrors}
            options={projects.map(p => ({
                label: p.name,
                value: p.id,
            }))}
            label={label}
            type="select"
            multi
            required
        />
    );
};

ProjectSelectorIds.defaultProps = {
    errors: [],
};

ProjectSelectorIds.propTypes = {
    keyValue: PropTypes.string.isRequired,
    value: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
    errors: PropTypes.array,
    label: PropTypes.any.isRequired,
};

const initialForm = (defaultSourceVersion, initialData, sourceCredentials) => {
    const values = {
        id: null,
        name: '',
        read_only: false,
        versions: [],
        description: '',
        project_ids: [],
        default_version_id: null,
        is_default_source: false,
        credentials: {
            dhis_name: '',
            dhis_url: '',
            dhis_login: '',
            dhis_password: '',
        },
    };
    if (initialData) {
        merge(values, {
            id: initialData.id,
            name: initialData.name,
            read_only: initialData.read_only,
            versions: initialData.versions,
            description: initialData.description,
            project_ids: initialData.projects?.map(p => p.id),
            default_version_id: initialData.default_version_id?.id,
            is_default_source:
                initialData.id === defaultSourceVersion?.source?.id,
            credentials: {
                dhis_name: sourceCredentials?.name,
                dhis_url: sourceCredentials?.url,
                dhis_login: sourceCredentials?.login,
                dhis_password: '',
            },
        });
    }
    return values;
};

const formIsValid = form => {
    const projectsIsEmpty = form.project_ids?.value.length === 0;
    return (
        !projectsIsEmpty &&
        !(form.default_version_id.value && !form.is_default_source.value)
    );
};

export const DataSourceDialogComponent = ({
    defaultSourceVersion,
    initialData,
    onSuccess,
    renderTrigger,
    sourceCredentials,
}) => {
    const [form, setFieldValue, setFieldErrors, setFormState] = useFormState(
        initialForm(),
    );
    const [isSaving, setIsSaving] = React.useState(false);

    const dispatch = useDispatch();
    const currentUser = useSelector(state => state.users.current);

    const checkDhis2 = useMutation(
        () =>
            postRequest(`/api/datasources/check_dhis2/`, {
                data_source: form.id.value,
                dhis2_url: form.credentials.value.dhis_url,
                dhis2_login: form.credentials.value.dhis_login,
                dhis2_password: form.credentials.value.dhis_password,
            }),
        {
            onSuccess: () => {
                // Clean errors
                [
                    'credentials',
                    'credentials_dhis2_url',
                    'credentials_dhis2_login',
                    'credentials_dhis2_password',
                ].forEach(key => setFieldErrors(key, []));
            },
            onError: error => {
                if (error.status === 400)
                    Object.entries(error.details).forEach(
                        ([errorKey, errorMessages]) => {
                            setFieldErrors(
                                `credentials_${errorKey}`,
                                errorMessages,
                            );
                        },
                    );
                else {
                    setFieldErrors('credentials', [
                        error.details?.detail ?? 'Test failed',
                    ]);
                }
            },
        },
    );

    const onConfirm = async closeDialog => {
        setIsSaving(true);
        const currentDataSource = {};
        Object.keys(form).forEach(key => {
            if (key !== 'is_default_source') {
                currentDataSource[key] = form[key].value;
            }
        });
        if (
            form.is_default_source.value &&
            currentUser &&
            form.default_version_id.value
        ) {
            await updateDefaultSource(
                dispatch,
                currentUser.account.id,
                form.default_version_id.value,
            );
            fetchCurrentUser();
        }

        try {
            if (initialData) {
                await updateDataSource(
                    dispatch,
                    form.id.value,
                    currentDataSource,
                );
            } else {
                await createDataSource(dispatch, currentDataSource);
            }
            dispatch(enqueueSnackbar(succesfullSnackBar()));
        } catch (error) {
            if (error.status === 400) {
                Object.entries(error.details).forEach(
                    ([errorKey, errorMessages]) => {
                        setFieldErrors(errorKey, errorMessages);
                    },
                );
            }
            setIsSaving(false);
            return;
        }
        setIsSaving(false);
        // Notify parents to refetch. Remove if passing parent to react-query
        onSuccess();
        closeDialog();
    };

    const allowConfirm = formIsValid(form);

    const setCredentials = (credentialsField, credentialsFieldValue) => {
        const newCredentials = {
            ...form.credentials.value,
            [credentialsField]: credentialsFieldValue,
        };
        setFieldValue('credentials', newCredentials);
    };

    return (
        <ConfirmCancelDialogComponent
            renderTrigger={renderTrigger}
            titleMessage={
                initialData
                    ? MESSAGES.updateDataSource
                    : MESSAGES.createDataSource
            }
            onConfirm={closeDialog => onConfirm(closeDialog)}
            onOpen={() => {
                checkDhis2.reset();
                setFormState(
                    initialForm(
                        defaultSourceVersion,
                        initialData,
                        sourceCredentials,
                    ),
                );
            }}
            confirmMessage={MESSAGES.save}
            cancelMessage={MESSAGES.cancel}
            maxWidth="md"
            allowConfirm={allowConfirm}
        >
            {isSaving && <LoadingSpinner fixed={false} />}
            <Grid container spacing={4} justifyContent="flex-start">
                <Grid xs={6} item>
                    <InputComponent
                        keyValue="name"
                        onChange={setFieldValue}
                        value={form.name.value}
                        errors={form.name.errors}
                        type="text"
                        label={MESSAGES.dataSourceName}
                        required
                    />
                    <InputComponent
                        keyValue="description"
                        onChange={setFieldValue}
                        value={form.description.value}
                        errors={form.description.errors}
                        type="text"
                        label={MESSAGES.dataSourceDescription}
                        multiline
                    />
                    <Box>
                        <ProjectSelectorIds
                            keyValue="project_ids"
                            onChange={setFieldValue}
                            value={form.project_ids.value}
                            errors={form.project_ids.error}
                            label={MESSAGES.projects}
                        />
                    </Box>
                    {form.id.value && (
                        <InputComponent
                            multi={false}
                            clearable={!form.is_default_source.value}
                            required={form.is_default_source.value}
                            keyValue="default_version_id"
                            onChange={setFieldValue}
                            value={form.default_version_id.value}
                            errors={form.default_version_id.errors}
                            type="select"
                            options={
                                initialData
                                    ? initialData.versions.map(v => ({
                                          label: v.number.toString(),
                                          value: v.id,
                                      }))
                                    : []
                            }
                            label={MESSAGES.defaultVersion}
                        />
                    )}
                    <Box>
                        <InputComponent
                            keyValue="read_only"
                            onChange={setFieldValue}
                            value={form.read_only.value}
                            errors={form.read_only.errors}
                            type="checkbox"
                            label={MESSAGES.dataSourceReadOnly}
                        />
                    </Box>
                    {form.id.value && (
                        <Box>
                            <InputComponent
                                keyValue="is_default_source"
                                disabled={form.is_default_source.value}
                                onChange={setFieldValue}
                                value={form.is_default_source.value}
                                errors={form.is_default_source.errors}
                                type="checkbox"
                                label={MESSAGES.defaultSource}
                            />
                        </Box>
                    )}
                </Grid>
                <Grid xs={6} item>
                    <InputComponent
                        value={form.credentials.value.dhis_name}
                        keyValue="dhis_name"
                        errors={form.credentials.errors}
                        label={MESSAGES.dhisName}
                        onChange={setCredentials}
                    />
                    <InputComponent
                        value={form.credentials.value.dhis_url}
                        keyValue="dhis_url"
                        errors={form.credentials_dhis2_url?.errors}
                        label={MESSAGES.dhisUrl}
                        onChange={setCredentials}
                    />
                    <InputComponent
                        value={form.credentials.value.dhis_login}
                        keyValue="dhis_login"
                        errors={form.credentials_dhis2_login?.errors}
                        label={MESSAGES.dhisLogin}
                        onChange={setCredentials}
                    />
                    <InputComponent
                        value={form.credentials.value.dhis_password}
                        keyValue="dhis_password"
                        errors={form.credentials_dhis2_password?.errors}
                        label={MESSAGES.dhisPassword}
                        onChange={setCredentials}
                        password
                    />
                    {checkDhis2.isLoading && <LoadingSpinner />}
                    <Button
                        onClick={checkDhis2.mutate}
                        disabled={!form.credentials.value.dhis_url}
                    >
                        <FormattedMessage
                            id="iaso.label.checkDHIS"
                            defaultMessage="Test settings"
                        />
                    </Button>
                    <Typography>
                        {checkDhis2.isSuccess && (
                            <FormattedMessage
                                id="iaso.checkDHIS.success"
                                defaultMessage="✅ Connection to server ok"
                            />
                        )}
                        {checkDhis2.isError && (
                            <FormattedMessage
                                id="iaso.checkDHIS.error"
                                defaultMessage="❌ Connection Error check settings"
                            />
                        )}
                    </Typography>
                </Grid>
            </Grid>
        </ConfirmCancelDialogComponent>
    );
};

DataSourceDialogComponent.defaultProps = {
    initialData: null,
    defaultSourceVersion: null,
    sourceCredentials: {},
};
DataSourceDialogComponent.propTypes = {
    onSuccess: PropTypes.func.isRequired,
    initialData: PropTypes.object,
    renderTrigger: PropTypes.func.isRequired,
    defaultSourceVersion: PropTypes.object,
    sourceCredentials: PropTypes.object,
};

export default DataSourceDialogComponent;
