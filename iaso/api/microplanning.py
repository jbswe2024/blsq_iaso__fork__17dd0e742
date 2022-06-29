from django.contrib.auth.models import User
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, filters, permissions
from rest_framework.permissions import IsAuthenticated

from hat.audit.models import Modification
from iaso.api.common import ModelViewSet, DeletionFilterBackend, ReadOnlyOrHasPermission
from iaso.models import Project, OrgUnit, Form
from iaso.models.microplanning import Team, TeamType, Planning, Assignment
from iaso.models.org_unit import OrgUnitQuerySet


class NestedProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name"]


class NestedTeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "deleted_at"]


class NestedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class AuditTeamSerializer(serializers.ModelSerializer):
    sub_teams = serializers.PrimaryKeyRelatedField(read_only=True, many=True)

    class Meta:
        model = Team
        fields = "__all__"


class TeamSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        users_in_account = User.objects.filter(iaso_profile__account=account)
        self.fields["project"].queryset = account.project_set.all()
        self.fields["manager"].queryset = users_in_account
        self.fields["users"].child_relation.queryset = users_in_account
        self.fields["sub_teams"].child_relation.queryset = Team.objects.filter_for_user(user)

    class Meta:
        model = Team
        fields = [
            "id",
            "project",
            "name",
            "description",
            "created_at",
            "deleted_at",
            "type",
            "users",
            "users_details",
            "manager",
            "parent",
            "sub_teams",
            "sub_teams_details",
        ]
        read_only_fields = ["created_at", "parent"]

    users_details = NestedUserSerializer(many=True, read_only=True, source="users")
    sub_teams_details = NestedTeamSerializer(many=True, read_only=True, source="sub_teams")

    def validate_sub_teams(self, values):
        def recursive_check(instance, children):
            for child in children:
                if instance == child:
                    raise serializers.ValidationError("noLoopInSubTree")
                recursive_check(instance, child.sub_teams.all())

        if self.instance:
            recursive_check(self.instance, values)
        return values

    def validate(self, attrs):
        validated_data = super(TeamSerializer, self).validate(attrs)

        user = self.context["request"].user
        validated_data["created_by"] = user

        project = validated_data.get("project", self.instance.project if self.instance else None)
        sub_teams = validated_data.get("sub_teams", self.instance.sub_teams.all() if self.instance else [])
        for sub_team in sub_teams:
            if sub_team.project != project:
                raise serializers.ValidationError("Sub teams must be in the same project")

        # Check that we don't have both user and teams
        # this is written in this way to support partial update
        users = None
        teams = None
        if self.instance:
            teams = self.instance.sub_teams.all()
            users = self.instance.users.all()
        if "sub_teams" in validated_data:
            teams = validated_data["sub_teams"]
        if "users" in validated_data:
            users = validated_data["users"]
        if teams and users:
            raise serializers.ValidationError("Teams cannot have both users and sub teams")
        if users:
            expected_type = TeamType.TEAM_OF_USERS
        elif teams:
            expected_type = TeamType.TEAM_OF_TEAMS
        else:
            expected_type = None
        if validated_data.get("type") and expected_type and expected_type != validated_data.get("type"):
            raise serializers.ValidationError("Incorrect type")
        if validated_data.get("type") is None:
            validated_data["type"] = expected_type

        return validated_data


class TeamSearchFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        search = request.query_params.get("search")

        if search:
            queryset = queryset.filter(Q(name__icontains=search)).distinct()

        return queryset


class TeamAncestorFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        ancestor_id = request.query_params.get("ancestor")

        if ancestor_id:
            try:
                ancestor = Team.objects.get(pk=ancestor_id)
            except Team.DoesNotExist:
                raise serializers.ValidationError(
                    {"ancestor": "Select a valid choice. That choice is not one of the available choices."}
                )
            queryset = queryset.filter(path__descendants=ancestor.path).exclude(id=ancestor.id)

        return queryset


class AuditMixin:
    audit_serializer: serializers.ModelSerializer

    def perform_create(self, serializer):
        # noinspection PyUnresolvedReferences
        super().perform_update(serializer)
        instance = serializer.instance

        serialized = [self.audit_serializer(instance).data]
        Modification.objects.create(
            user=self.request.user,
            past_value=[],
            new_value=serialized,
            content_object=instance,
            source="API " + self.request.method + self.request.path,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_value = [self.audit_serializer(instance).data]
        # noinspection PyUnresolvedReferences
        super().perform_update(serializer)
        instance = serializer.instance
        new_value = [self.audit_serializer(instance).data]
        Modification.objects.create(
            user=self.request.user,
            past_value=old_value,
            new_value=new_value,
            content_object=instance,
            source="API " + self.request.method + self.request.path,
        )

    def perform_destroy(self, instance):
        old_value = [self.audit_serializer(instance).data]
        # noinspection PyUnresolvedReferences
        super().perform_destroy(instance)
        # for soft delete, we still have an existing instance
        new_value = [self.audit_serializer(instance).data]
        Modification.objects.create(
            user=self.request.user,
            past_value=old_value,
            new_value=new_value,
            content_object=instance,
            source=f"API {self.request.method} {self.request.path}",
        )


class TeamViewSet(AuditMixin, ModelViewSet):
    """Api for teams

    Read access for all auth users.
    Write access necessitate iaso_teams permissions.

    The tree assignation are handled by settings the child sub teams (parent is readonly)
    """

    remove_results_key_if_paginated = True
    filter_backends = [
        TeamAncestorFilterBackend,
        filters.OrderingFilter,
        DjangoFilterBackend,
        TeamSearchFilterBackend,
        DeletionFilterBackend,
    ]
    permission_classes = [ReadOnlyOrHasPermission("menupermissions.iaso_teams")]
    serializer_class = TeamSerializer
    queryset = Team.objects.all()
    ordering_fields = ["id", "name", "created_at", "updated_at", "type"]
    filterset_fields = {
        "name": ["icontains"],
        "project": ["exact"],
    }

    audit_serializer = AuditTeamSerializer

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter_for_user(user)


class PlanningSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        self.fields["project"].queryset = account.project_set.all()
        self.fields["team"].queryset = Team.objects.filter_for_user(user)
        self.fields["org_unit"].queryset = OrgUnit.objects.filter_for_user_and_app_id(user, None)
        self.fields["forms"].child_relation.queryset = Form.objects.filter_for_user_and_app_id(user).distinct()

    class Meta:
        model = Planning
        fields = [
            "id",
            "name",
            "team_details",
            "team",
            "org_unit",
            "forms",
            "project",
            "description",
            "published_at",
            "started_at",
            "ended_at",
        ]
        read_only_fields = ["created_at", "parent"]

    team_details = NestedTeamSerializer(source="team", read_only=True)

    def validate(self, attrs):
        validated_data = super().validate(attrs)

        user = self.context["request"].user
        validated_data["created_by"] = user
        validation_errors = {}
        if (
            validated_data.get("started_at")
            and validated_data.get("ended_at")
            and validated_data["started_at"] > validated_data["ended_at"]
        ):
            #    raise serializers.ValidationError({"started_at": "Start date cannot be after end date"})
            validation_errors["started_at"] = "startDateAfterEndDate"
            validation_errors["ended_at"] = "EndDateBeforeStartDate"
        project = validated_data.get("project", self.instance.project if self.instance else None)

        team = validated_data.get("team", self.instance.team if self.instance else None)
        if team.project != project:
            validation_errors["team"] = "planningAndTeams"
            # validation_errors.append({"team":"Planning and team must be in the same project"})

        forms = validated_data.get("forms", self.instance.forms if self.instance else None)
        for form in forms:
            if not form in project.forms.all():
                # validation_errors.append({"forms":"Planning and forms must be in the same project"})
                validation_errors["forms"] = "planningAndForms"

        org_unit = validated_data.get("org_unit", self.instance.org_unit if self.instance else None)
        if org_unit and org_unit.org_unit_type:
            org_unit_projects = org_unit.org_unit_type.projects.all()
            if not project in org_unit_projects:
                validation_errors["org_unit"] = "planningAndOrgUnit"
        if validation_errors:
            raise serializers.ValidationError(validation_errors)

        return validated_data


class AuditPlanningSerializer(serializers.ModelSerializer):
    class Meta:
        model = Planning
        fields = "__all__"


class PlanningSearchFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        search = request.query_params.get("search")

        if search:
            queryset = queryset.filter(Q(name__icontains=search)).distinct()
        return queryset


class PublishingStatusFilterBackend(filters.BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        status = request.query_params.get("publishing_status", "all")

        if status == "draft":
            queryset = queryset.filter(published_at__isnull=True)
        if status == "published":
            queryset = queryset.exclude(published_at__isnull=True)
        return queryset


class PlanningViewSet(AuditMixin, ModelViewSet):
    remove_results_key_if_paginated = True
    permission_classes = [ReadOnlyOrHasPermission("menupermissions.iaso_planning")]
    serializer_class = PlanningSerializer
    queryset = Planning.objects.all()
    filter_backends = [
        filters.OrderingFilter,
        DjangoFilterBackend,
        PublishingStatusFilterBackend,
        PlanningSearchFilterBackend,
        DeletionFilterBackend,
    ]
    ordering_fields = ["id", "name", "started_at", "ended_at"]
    filterset_fields = {
        "name": ["icontains"],
        "started_at": ["gte", "lte"],
        "ended_at": ["gte", "lte"],
    }
    audit_serializer = AuditPlanningSerializer

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter_for_user(user)


class AssignmentSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context["request"].user
        account = user.iaso_profile.account
        users_in_account = User.objects.filter(iaso_profile__account=account)

        self.fields["user"].queryset = users_in_account
        self.fields["planning"].queryset = Planning.objects.filter_for_user(user)
        self.fields["team"].queryset = Team.objects.filter_for_user(user)
        self.fields["org_unit"].queryset = OrgUnit.objects.filter_for_user_and_app_id(user, None)

    class Meta:
        model = Assignment
        fields = [
            "id",
            "planning",
            "user",
            "team",
            "org_unit",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        validated_data = super().validate(attrs)

        user = self.context["request"].user
        validated_data["created_by"] = user

        assigned_user = validated_data.get("user", self.instance.user if self.instance else None)
        assigned_team = validated_data.get("team", self.instance.team if self.instance else None)
        if assigned_team and assigned_user:
            raise serializers.ValidationError("Cannot assign on both team and users")
        if not assigned_team and not assigned_user:
            raise serializers.ValidationError("Should be at least an assigned team or user")

        planning = validated_data.get("planning", self.instance.planning if self.instance else None)
        org_unit: OrgUnit = validated_data.get("org_unit", self.instance.org_unit if self.instance else None)

        org_units_available: OrgUnitQuerySet = self.fields["org_unit"].queryset
        org_units_available = org_units_available.descendants(planning.org_unit)
        if org_unit not in org_units_available:
            raise serializers.ValidationError({"org_unit": "OrgUnit is not in planning scope"})
        # TODO More complex check possible:
        # - Team or user should be under the root planning team
        # - check that the hierarchy of the planning assignement is respected
        # - one of the parent org unit should be assigned to a parent team of the assigned user or team
        # - type  of org unit is valid for this form
        return validated_data


class AuditAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = "__all__"


class AssignmentViewSet(AuditMixin, ModelViewSet):
    """Use the same permission as planning. Multi tenancy is done via the planning. An assignment don't make much
    sense outside of it's planning."""

    remove_results_key_if_paginated = True
    permission_classes = [IsAuthenticated, ReadOnlyOrHasPermission("menupermissions.iaso_planning")]
    serializer_class = AssignmentSerializer
    queryset = Assignment.objects.all()
    filter_backends = [
        filters.OrderingFilter,
        DjangoFilterBackend,
        PublishingStatusFilterBackend,
        DeletionFilterBackend,
    ]
    ordering_fields = ["id", "name", "started_at", "ended_at"]
    filterset_fields = {
        "planning": ["exact"],
        "team": ["exact"],
    }
    audit_serializer = AuditAssignmentSerializer

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter_for_user(user)


# noinspection PyMethodMayBeStatic
class MobilePlanningSerializer(serializers.ModelSerializer):
    "Only used to serialize for mobile"

    def save(self):
        # ensure that we can't save from here
        raise NotImplemented

    class Meta:
        model = Planning
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "assignments",
        ]

    assignments = serializers.SerializerMethodField()

    def get_assignments(self, planning: Planning):
        user = self.context["request"].user
        r = []
        for a in planning.assignment_set.filter(user=user):
            r.append({"org_unit": a.org_unit.id, "form_ids": [f.id for f in planning.forms.all()]})
        return r


class ReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return False


class MobilePlanningViewSet(ModelViewSet):
    """Planning for mobile, contrary to the more general API.
    it only returns the Planning where the user has assigned OrgUnit
    and his assignments
    """

    remove_results_key_if_paginated = True
    permission_classes = [IsAuthenticated, ReadOnly]
    serializer_class = MobilePlanningSerializer
    queryset = Assignment.objects.all()

    def get_queryset(self):
        user = self.request.user
        # Only return  planning which 1. contain assignment for user 2. are published 3. undeleted
        # distinct is necessary otherwise if a planning contain multiple assignment for the same user it got duplicated

        return (
            Planning.objects.filter(assignment__user=user)
            .exclude(published_at__isnull=True)
            .filter(deleted_at__isnull=True)
            .distinct()
        )
