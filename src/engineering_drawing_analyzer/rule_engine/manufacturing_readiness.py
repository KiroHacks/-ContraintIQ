"""Manufacturing readiness verification rules.

This module implements the five rules that check whether a drawing contains
all information a machinist needs to fabricate the part:

* ``TitleBlockRule``          — verify the title block has all required fields.
* ``SurfaceFinishRule``       — verify functional surfaces have finish callouts.
* ``HoleSpecificationRule``   — verify holes specify diameter, depth, tolerance,
                                and thread spec.
* ``ViewSufficiencyRule``     — verify sufficient orthographic views exist.
* ``NoteContradictionRule``   — detect contradictions between notes or between
                                notes and dimensions.

These are stub implementations that return empty issue lists.  Task 14 will
implement the full logic.
"""

from __future__ import annotations

from ..models import GeometricModel, Issue


class TitleBlockRule:
    """Verify that the title block contains all required fields.

    Required fields: part_number, revision, material, scale, units.
    One CRITICAL issue per missing field.

    Stub — returns empty list until task 14 implements full logic.
    """

    rule_id: str = "TITLE_BLOCK_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class SurfaceFinishRule:
    """Verify that functional surfaces have surface finish callouts.

    Missing callout → WARNING.

    Stub — returns empty list until task 14 implements full logic.
    """

    rule_id: str = "SURFACE_FINISH_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class HoleSpecificationRule:
    """Verify that holes specify diameter, depth (if blind), tolerance, and thread spec.

    Missing specification → CRITICAL.

    Stub — returns empty list until task 14 implements full logic.
    """

    rule_id: str = "HOLE_SPECIFICATION_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class ViewSufficiencyRule:
    """Verify that the drawing has sufficient orthographic views.

    Insufficient views → CRITICAL.

    Stub — returns empty list until task 14 implements full logic.
    """

    rule_id: str = "VIEW_SUFFICIENCY_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class NoteContradictionRule:
    """Detect contradictions between notes or between notes and dimensions.

    Contradiction → CRITICAL.

    Stub — returns empty list until task 14 implements full logic.
    """

    rule_id: str = "NOTE_CONTRADICTION_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []
