"""Engineering Drawing Analyzer — automated verification of ANSI-standard engineering drawings."""

from .ingestion import IngestionService
from .serializer import GeometricModelSerializer, models_equivalent
from .parsers import DrawingParser, DXFParser
from .models import (
    Severity,
    DrawingFormat,
    ReportFormat,
    Point2D,
    LocationReference,
    Tolerance,
    Dimension,
    FeatureControlFrame,
    Datum,
    Feature,
    TitleBlock,
    View,
    GeometricModel,
    Issue,
    VerificationReport,
)
from .exceptions import (
    ParseError,
    FileTooLargeError,
    UnsupportedFormatError,
    UnsupportedReportFormatError,
)

__all__ = [
    "Severity",
    "DrawingFormat",
    "ReportFormat",
    "Point2D",
    "LocationReference",
    "Tolerance",
    "Dimension",
    "FeatureControlFrame",
    "Datum",
    "Feature",
    "TitleBlock",
    "View",
    "GeometricModel",
    "Issue",
    "VerificationReport",
    "ParseError",
    "FileTooLargeError",
    "UnsupportedFormatError",
    "UnsupportedReportFormatError",
    "GeometricModelSerializer",
    "models_equivalent",
    "IngestionService",
    "DrawingParser",
    "DXFParser",
]
