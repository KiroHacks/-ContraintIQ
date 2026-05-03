"""GD&T compliance verification rules.

This module implements the three rules that validate GD&T annotations against
the ANSI/ASME Y14.5-2018 standard:

* ``GDTSymbolSetRule``                — validate all GD&T symbols are from the
                                        standard symbol set.
* ``CompositeFCFRule``                — verify composite feature control frames
                                        follow Y14.5 rules.
* ``DatumFeatureSymbolPlacementRule`` — verify datum feature symbols are applied
                                        to physical features, not centerlines.

These are stub implementations that return empty issue lists.  Task 15 will
implement the full logic.
"""

from __future__ import annotations

from ..models import GeometricModel, Issue


class GDTSymbolSetRule:
    """Validate all FeatureControlFrame.gdt_symbol values against the Y14.5 set.

    Non-standard symbol → WARNING.

    Stub — returns empty list until task 15 implements full logic.
    """

    rule_id: str = "GDT_SYMBOL_SET_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class CompositeFCFRule:
    """Verify composite feature control frames follow Y14.5 rules.

    Violation → CRITICAL.

    Stub — returns empty list until task 15 implements full logic.
    """

    rule_id: str = "COMPOSITE_FCF_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []


class DatumFeatureSymbolPlacementRule:
    """Verify datum feature symbols are applied to physical features.

    Incorrect placement → WARNING.

    Stub — returns empty list until task 15 implements full logic.
    """

    rule_id: str = "DATUM_FEATURE_SYMBOL_PLACEMENT_RULE"

    def check(self, model: GeometricModel) -> list[Issue]:
        return []
