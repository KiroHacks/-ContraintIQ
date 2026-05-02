"""Rule Engine subpackage for the Engineering Drawing Analyzer.

This package contains the `VerificationRule` protocol, the `RuleEngine` class,
and all rule modules organized by verification domain.
"""

from .engine import RuleEngine, VerificationRule
from .dimension_completeness import (
    SizeDimensionRule,
    PositionDimensionRule,
    OverDimensionRule,
    AngularDimensionRule,
)

__all__ = [
    "RuleEngine",
    "VerificationRule",
    "SizeDimensionRule",
    "PositionDimensionRule",
    "OverDimensionRule",
    "AngularDimensionRule",
]
