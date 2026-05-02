# Implementation Plan: Engineering Drawing Analyzer

## Overview

Implement a Python-based engineering drawing analysis pipeline that ingests DXF, DWG, and PDF drawings, parses them into a normalized `GeometricModel`, runs ML-augmented symbol detection and deterministic rule verification, and produces structured `VerificationReport` output in JSON, HTML, and PDF formats.

The implementation follows the pipeline order: data models → ingestion → parsers → serializer → symbol detector → rule engine modules → report generator → integration wiring.

## Tasks

- [x] 1. Set up project structure, dependencies, and core data models
  - Create the package directory layout: `src/engineering_drawing_analyzer/`, `tests/unit/`, `tests/property/`, `tests/integration/`, `tests/fixtures/sample_drawings/`, `tests/fixtures/expected_reports/`, `tests/fixtures/labeled_mechanical/`, `scripts/`
  - Create `pyproject.toml` (or `setup.cfg`) with dependencies: `ezdxf`, `pymupdf`, `weasyprint`, `jinja2`, `hypothesis`, `pytest`, `pytest-benchmark`
  - Implement all core data model dataclasses and enums in `src/engineering_drawing_analyzer/models.py`: `Severity`, `DrawingFormat`, `ReportFormat`, `Point2D`, `LocationReference`, `Tolerance`, `Dimension`, `FeatureControlFrame`, `Datum`, `Feature`, `TitleBlock`, `View`, `GeometricModel`, `Issue`, `VerificationReport`
  - Implement all custom exception classes in `src/engineering_drawing_analyzer/exceptions.py`: `ParseError`, `FileTooLargeError`, `UnsupportedFormatError`, `UnsupportedReportFormatError`
  - _Requirements: 1.1, 1.3, 1.4, 6.1, 6.2, 6.5_

- [x] 2. Implement the GeometricModel serializer with round-trip fidelity
  - Implement `GeometricModelSerializer.serialize()` in `src/engineering_drawing_analyzer/serializer.py` — converts `GeometricModel` to a JSON-serializable `dict` with `schema_version`, storing all geometry as float lists and enums as string names
  - Implement `GeometricModelSerializer.deserialize()` — reconstructs a `GeometricModel` from a previously serialized `dict`, handling all nested types
  - Implement `models_equivalent()` helper function for structural equality comparison (used in tests)
  - _Requirements: 1.5, 1.6_

  - [ ]* 2.1 Write property test for round-trip fidelity (Property 1)
    - **Property 1: Geometric Model Round-Trip Fidelity**
    - Use `@given(st.builds(GeometricModel, ...))` with Hypothesis strategies for all nested types
    - Assert `models_equivalent(model, deserialize(serialize(model)))` for all generated models
    - Place in `tests/property/test_round_trip.py`
    - **Validates: Requirements 1.2, 1.5, 1.6**

  - [ ]* 2.2 Write unit tests for the serializer
    - Test serialization of a fully-populated `GeometricModel` fixture
    - Test deserialization of a known JSON dict back to the expected model
    - Test that `schema_version` field is preserved
    - Place in `tests/unit/test_serializer.py`
    - _Requirements: 1.5, 1.6_

- [x] 3. Checkpoint — Ensure serializer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the Ingestion Layer
  - Implement `IngestionService.ingest()` in `src/engineering_drawing_analyzer/ingestion.py` — validates file size against 100 MB limit, raises `FileTooLargeError` with actual and limit sizes if exceeded
  - Implement `IngestionService.detect_format()` — detects `DrawingFormat` from magic bytes and file extension; raises `UnsupportedFormatError` listing supported formats for unrecognized files
  - _Requirements: 1.1, 1.3, 1.4_

  - [ ]* 4.1 Write unit tests for the Ingestion Layer
    - Test that files over 100 MB raise `FileTooLargeError` with correct size values
    - Test format detection for DXF, DWG, and PDF magic bytes
    - Test that unrecognized formats raise `UnsupportedFormatError` listing supported formats
    - Place in `tests/unit/test_ingestion.py`
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 5. Implement the DXF Parser
  - Implement `DXFParser.parse()` in `src/engineering_drawing_analyzer/parsers/dxf_parser.py` using `ezdxf`
  - Iterate modelspace entities: `LINE`, `ARC`, `CIRCLE`, `LWPOLYLINE`, `DIMENSION`, `LEADER`, `TOLERANCE`, `INSERT`, `MTEXT`/`TEXT`
  - Extract `DIMENSION` entities into `Dimension` objects with value, tolerance, unit, and `LocationReference`
  - Extract `TOLERANCE` entities (GD&T feature control frames) into `FeatureControlFrame` objects with `gdt_symbol`, `tolerance_value`, `datum_references`, and `material_condition`
  - Extract `INSERT` entities referencing title block blocks into `TitleBlock`
  - Use `ezdxf.recover` for structural repair of corrupted files; raise `ParseError` with byte offset if unrecoverable
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 5.1 Write unit tests for the DXF Parser
    - Test parsing a minimal valid DXF fixture with known dimensions and GD&T annotations
    - Test that corrupted DXF raises `ParseError` with location info
    - Place in `tests/unit/test_dxf_parser.py`
    - _Requirements: 1.2, 1.3_

- [ ] 6. Implement the DWG Parser
  - Implement `DWGParser.parse()` in `src/engineering_drawing_analyzer/parsers/dwg_parser.py`
  - Convert DWG → DXF temp file using `oda_file_converter` CLI subprocess call
  - Delegate to `DXFParser` after successful conversion
  - Raise `ParseError` with ODA converter exit code and stderr on conversion failure
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 6.1 Write unit tests for the DWG Parser
    - Test that a successful ODA conversion delegates correctly to `DXFParser`
    - Test that ODA converter failure raises `ParseError` with exit code
    - Place in `tests/unit/test_dwg_parser.py`
    - _Requirements: 1.2, 1.3_

- [x] 7. Implement the PDF Parser
  - Implement `PDFParser.parse()` in `src/engineering_drawing_analyzer/parsers/pdf_parser.py` using `PyMuPDF`
  - Extract vector paths (lines, arcs, curves) from each page using `page.get_drawings()`
  - Extract text annotations using `page.get_text("dict")` to recover dimension text, GD&T symbols, and title block fields
  - Heuristically associate text near geometry to form `Dimension` and `FeatureControlFrame` objects
  - Raise `ParseError` with page number on partial/corrupted content
  - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 7.1 Write unit tests for the PDF Parser
    - Test parsing a minimal vector PDF fixture with known annotations
    - Test that corrupted PDF raises `ParseError` with page number
    - Place in `tests/unit/test_pdf_parser.py`
    - _Requirements: 1.2, 1.3_

- [x] 8. Checkpoint — Ensure all parser and ingestion tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement the Symbol Detector (DPSS)
  - Implement `DetectedSymbol` dataclass and `SymbolDetector` class in `src/engineering_drawing_analyzer/symbol_detector.py`
  - Implement `SymbolDetector.__init__()` — loads DPSS model weights from `model_weights_path`; sets `confidence_threshold`
  - Implement `SymbolDetector.detect()` — runs DPSS over `GeometricModel` primitives and optional raster image; returns `list[DetectedSymbol]`; falls back gracefully to vector-only mode if `raster_image` is `None`
  - Implement `SymbolDetector.enrich()` — merges detected symbols into `GeometricModel`: unconditionally accept `confidence >= 0.8`, flag as tentative `0.5 <= confidence < 0.8`, discard `< 0.5`; heuristic parser values take precedence over low-confidence ML detections
  - Implement fallback behavior: if model weights unavailable or inference fails, append a `WARNING` issue and continue with heuristic-only model
  - _Requirements: 1.2_

  - [ ]* 9.1 Write unit tests for the Symbol Detector
    - Test that `enrich()` correctly merges high-confidence detections (`>= 0.8`) into the `GeometricModel`
    - Test that low-confidence detections (`< 0.5`) are discarded
    - Test fallback behavior when model weights are unavailable
    - Place in `tests/unit/test_symbol_detector.py`
    - _Requirements: 1.2_

- [ ] 10. Implement the Rule Engine framework and `dimension_completeness` module
  - Implement `VerificationRule` protocol and `RuleEngine` class in `src/engineering_drawing_analyzer/rule_engine/engine.py`
  - `RuleEngine.run()` applies all registered rules in order, catches per-rule exceptions (logs with rule ID, appends `INFO` issue), and returns the combined `list[Issue]`
  - Implement `dimension_completeness` rules in `src/engineering_drawing_analyzer/rule_engine/dimension_completeness.py`:
    - `SizeDimensionRule`: every `Feature` must have at least one size `Dimension`; missing → `CRITICAL`
    - `PositionDimensionRule`: every `Feature`'s position must be dimensioned relative to a `Datum` or fully dimensioned feature; missing → `CRITICAL`
    - `OverDimensionRule`: detect conflicting dimensions on the same feature → `WARNING`
    - `AngularDimensionRule`: features with `is_angular == True` must have an angular dimension; missing → `CRITICAL`
  - All `CRITICAL` issues must include `corrective_action` (non-null, non-empty) and `standard_reference` where applicable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2_

  - [ ]* 10.1 Write property test for missing required dimension (Property 2)
    - **Property 2: Missing Required Dimension Produces Critical Issue**
    - Generate `GeometricModel` instances with features missing size, position, or angular dimensions
    - Assert at least one `CRITICAL` issue referencing the feature is produced
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7, 2.8**

  - [ ]* 10.2 Write property test for over-dimension detection (Property 3)
    - **Property 3: Over-Dimension Detection Produces Warning**
    - Generate `GeometricModel` instances with features having conflicting dimensions
    - Assert at least one `WARNING` issue referencing the conflicting dimensions is produced
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 10.3 Write unit tests for dimension_completeness rules
    - Test each rule with concrete fixtures: feature with no dimensions, feature with conflicting dimensions, angular feature without angular dimension
    - Place in `tests/unit/test_rule_dimension_completeness.py`
    - _Requirements: 2.1–2.8_

- [ ] 11. Implement `geometric_constraints` rule module
  - Implement rules in `src/engineering_drawing_analyzer/rule_engine/geometric_constraints.py`:
    - `DatumReferenceFrameRule`: verify a valid `Datum_Reference_Frame` exists; missing → `CRITICAL`; missing secondary/tertiary datum → `WARNING`
    - `FeatureOrientationRule`: every `Feature`'s orientation must be fully constrained relative to DRF or another constrained feature; unconstrained DOF → `CRITICAL`
    - `GDTDatumReferenceRule`: `FeatureControlFrame.datum_references` must all reference defined `Datum` labels; undefined reference → `CRITICAL`
  - All `CRITICAL` issues must include `corrective_action` and `standard_reference`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2_

  - [ ]* 11.1 Write unit tests for geometric_constraints rules
    - Test missing DRF, missing secondary datum, unconstrained feature, undefined datum reference
    - Place in `tests/unit/test_rule_geometric_constraints.py`
    - _Requirements: 3.1–3.7_

- [ ] 12. Implement `tolerance_verification` rule module
  - Implement rules in `src/engineering_drawing_analyzer/rule_engine/tolerance_verification.py`:
    - `DimensionToleranceRule`: every `Dimension` must have a `Tolerance` or the model must have `general_tolerance`; missing → `CRITICAL`
    - `FCFCompletenessRule`: `FeatureControlFrame` must have a valid `tolerance_value` and required datum references per ASME Y14.5; missing → `CRITICAL`
    - `ToleranceStackUpRule`: detect dimension chains where sum of tolerances exceeds the tightest tolerance; violation → `WARNING` with calculated stack-up value in description
  - All `CRITICAL` issues must include `corrective_action` and `standard_reference`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.2_

  - [ ]* 12.1 Write property test for missing tolerance (Property 4)
    - **Property 4: Missing Tolerance Produces Critical Issue**
    - Generate `GeometricModel` instances with `general_tolerance == None` and dimensions with `tolerance == None`
    - Assert at least one `CRITICAL` issue per untolerated dimension
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 12.2 Write property test for tolerance stack-up (Property 12)
    - **Property 12: Tolerance Stack-Up Violation Produces Warning**
    - Generate dimension chains where sum of tolerances exceeds the tightest tolerance
    - Assert at least one `WARNING` issue with the calculated stack-up value in its description
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 4.5, 4.6**

  - [ ]* 12.3 Write unit tests for tolerance_verification rules
    - Test dimension with no tolerance and no general tolerance block, malformed FCF, tolerance stack-up scenario
    - Place in `tests/unit/test_rule_tolerance_verification.py`
    - _Requirements: 4.1–4.6_

- [ ] 13. Checkpoint — Ensure all rule engine tests pass so far
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement `manufacturing_readiness` rule module
  - Implement rules in `src/engineering_drawing_analyzer/rule_engine/manufacturing_readiness.py`:
    - `TitleBlockRule`: verify `TitleBlock` has all required fields (part_number, revision, material, scale, units); one `CRITICAL` issue per missing field (exactly one per field — no duplicates)
    - `SurfaceFinishRule`: verify functional surfaces have surface finish callouts; missing → `WARNING`
    - `HoleSpecificationRule`: holes must specify diameter, depth (if blind), tolerance, and thread spec (if threaded); missing → `CRITICAL`
    - `ViewSufficiencyRule`: drawing must have sufficient orthographic views to represent all features; insufficient → `CRITICAL`
    - `NoteContradictionRule`: detect contradictions between notes or between notes and dimensions → `CRITICAL`
  - All `CRITICAL` issues must include `corrective_action` and `standard_reference`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 8.1, 8.2_

  - [ ]* 14.1 Write property test for title block missing fields (Property 11)
    - **Property 11: Title Block Missing Fields Produce One Critical Issue Per Field**
    - Generate `TitleBlock` instances with randomly missing required fields
    - Assert exactly one `CRITICAL` issue per missing field (no more, no fewer)
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 14.2 Write unit tests for manufacturing_readiness rules
    - Test title block with each field missing individually, hole missing depth spec, insufficient views
    - Place in `tests/unit/test_rule_manufacturing_readiness.py`
    - _Requirements: 5.1–5.10_

- [ ] 15. Implement `gdt_compliance` rule module
  - Implement rules in `src/engineering_drawing_analyzer/rule_engine/gdt_compliance.py`:
    - `GDTSymbolSetRule`: validate all `FeatureControlFrame.gdt_symbol` values against the ANSI/ASME Y14.5-2018 standard symbol set; non-standard → `WARNING`
    - `CompositeFCFRule`: verify composite feature control frames follow Y14.5 pattern-locating and feature-relating tolerance zone rules; violation → `CRITICAL`
    - `DatumFeatureSymbolPlacementRule`: datum feature symbols must be applied to physical features, not centerlines or axes; incorrect → `WARNING`
  - All `CRITICAL` issues must include `corrective_action` and `standard_reference`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2_

  - [ ]* 15.1 Write property test for non-standard GD&T symbol (Property 9)
    - **Property 9: Non-Standard GD&T Symbol Produces Warning**
    - Generate `FeatureControlFrame` instances with `gdt_symbol` values outside the Y14.5-2018 set
    - Assert at least one `WARNING` issue identifying the symbol and its location
    - Place in `tests/property/test_gdt_symbols.py`
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 15.2 Write unit tests for gdt_compliance rules
    - Test non-standard symbol, malformed composite FCF, datum symbol on centerline
    - Place in `tests/unit/test_rule_gdt_compliance.py`
    - _Requirements: 7.1–7.6_

- [ ] 16. Implement issue list completeness and corrective action properties
  - Wire all five rule modules into `RuleEngine` registration in `src/engineering_drawing_analyzer/rule_engine/__init__.py`
  - Implement systemic pattern detection in `VerificationReport` assembly: when more than three `Issue` objects share the same `issue_type`, add a `systemic_patterns` entry referencing that type and the relevant standard
  - Implement `overall_status` logic: `"Pass"` if and only if `len(issues) == 0`
  - _Requirements: 6.1, 6.3, 8.3_

  - [ ]* 16.1 Write property test for issue list completeness (Property 5)
    - **Property 5: Issue List Completeness**
    - Generate `GeometricModel` instances with known violations; assert every violating element appears in at least one `CRITICAL` issue; assert no compliant element appears in a `CRITICAL` issue
    - Place in `tests/property/test_issue_severity.py`
    - **Validates: Requirements 2.2, 2.4, 2.8, 3.2, 3.5, 3.7, 4.2, 4.4, 5.2, 5.6, 5.8, 5.10**

  - [ ]* 16.2 Write property test for corrective actions on Critical issues (Property 10)
    - **Property 10: Critical Issues Always Carry Corrective Action and Standard Reference**
    - Generate `GeometricModel` instances that trigger `CRITICAL` issues
    - Assert every `CRITICAL` issue has non-null, non-empty `corrective_action`; assert GD&T-related `CRITICAL` issues have non-null `standard_reference`
    - Place in `tests/property/test_corrective_actions.py`
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 16.3 Write property test for systemic pattern detection (Property 8)
    - **Property 8: Systemic Pattern Detection Threshold**
    - Generate `GeometricModel` instances that produce more than three issues of the same `issue_type`
    - Assert the resulting `VerificationReport.systemic_patterns` contains at least one entry referencing that issue type
    - Place in `tests/property/test_systemic_patterns.py`
    - **Validates: Requirements 8.3**

- [ ] 17. Checkpoint — Ensure all rule engine and wiring tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement the Report Generator
  - Implement `ReportGenerator.generate()` in `src/engineering_drawing_analyzer/report_generator.py`
  - **JSON format**: serialize `VerificationReport` to JSON using Python's `json` module; validate all required fields are present with correct types; `issue_counts` must match actual counts per severity
  - **HTML format**: render using Jinja2 template (`templates/report.html.j2`); self-contained single-file output with embedded CSS
  - **PDF format**: render HTML output through `WeasyPrint` to produce PDF bytes
  - Raise `UnsupportedReportFormatError` listing `["JSON", "PDF", "HTML"]` for any other format string
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 18.1 Write property test for JSON report schema validity (Property 6)
    - **Property 6: Report JSON Schema Validity**
    - Generate `VerificationReport` instances and serialize to JSON
    - Assert all required fields are present with correct types; `overall_status` is exactly `"Pass"` or `"Fail"`; `issue_counts` values match actual `Issue` counts per severity
    - Place in `tests/property/test_report_schema.py`
    - **Validates: Requirements 6.1, 6.2, 6.4**

  - [ ]* 18.2 Write property test for pass status iff zero issues (Property 7)
    - **Property 7: Pass Status If and Only If Zero Issues**
    - Generate `VerificationReport` instances with varying issue lists
    - Assert `overall_status == "Pass"` iff `len(issues) == 0`
    - Place in `tests/property/test_report_schema.py`
    - **Validates: Requirements 6.1, 6.3**

  - [ ]* 18.3 Write property test for unsupported format error (Property 13)
    - **Property 13: Unsupported Report Format Raises Error with Supported List**
    - Generate arbitrary format strings not in `{"JSON", "PDF", "HTML"}`
    - Assert `UnsupportedReportFormatError` is raised with the requested format and all supported formats listed
    - Place in `tests/property/test_report_schema.py`
    - **Validates: Requirements 6.5**

  - [ ]* 18.4 Write unit tests for the Report Generator
    - Test JSON output structure against the defined schema with a known `VerificationReport` fixture
    - Test HTML output is a valid self-contained document
    - Test PDF output is non-empty bytes
    - Test unsupported format raises `UnsupportedReportFormatError`
    - Place in `tests/unit/test_report_generator.py`
    - _Requirements: 6.1–6.5_

- [ ] 19. Implement the main analysis pipeline and wire all components together
  - Implement `AnalysisPipeline` class in `src/engineering_drawing_analyzer/pipeline.py` that orchestrates the full flow: `IngestionService` → format-specific `DrawingParser` → `SymbolDetector.detect()` + `SymbolDetector.enrich()` → `RuleEngine.run()` → `ReportGenerator.generate()`
  - Implement analysis timeout: if pipeline exceeds 60 seconds, return a partial report with a `WARNING` issue noting incomplete analysis
  - Implement rule engine exception isolation: catch per-rule exceptions, log with rule ID, append `INFO` issue, continue with remaining rules
  - Implement structured JSON logging for all errors: `timestamp`, `level`, `component`, `drawing_id`, `error_type`, `message` (no raw file content)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1, 6.6_

  - [ ]* 19.1 Write integration tests for the full pipeline
    - Parse real DXF sample files (from `ezdxf` test suite) through the full pipeline; assert report structure and issue types
    - Parse vector PDF fixtures through the full pipeline; assert report structure
    - Place in `tests/integration/` (separate from DPSS integration tests)
    - _Requirements: 1.1, 1.2, 6.1, 6.4_

- [ ] 20. Implement DPSS integration tests and fine-tuning evaluation script
  - Implement `tests/integration/test_dpss_pipeline.py`: run the fine-tuned DPSS model against labeled mechanical drawing fixtures; assert known GD&T symbols, dimension callouts, and title block regions are detected with `confidence >= 0.8`; assert enriched `GeometricModel` contains expected `Feature` and `FeatureControlFrame` objects
  - Implement `scripts/evaluate_dpss.py`: evaluate fine-tuned model on held-out mechanical drawing test split; report Panoptic Quality (PQ), Segmentation Quality (SQ), and Recognition Quality (RQ) metrics
  - _Requirements: 1.2_

- [ ] 21. Add performance benchmark test for the 60-second SLA
  - Implement a `pytest-benchmark` test that generates a synthetic `GeometricModel` with exactly 500 features and runs the full pipeline (excluding ML inference) through `AnalysisPipeline`
  - Assert the benchmark completes within 60 seconds
  - Place in `tests/` as `test_performance.py`
  - _Requirements: 6.6_

- [ ] 22. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints at tasks 3, 8, 13, 17, and 22 ensure incremental validation
- Property tests (Hypothesis, minimum 100 iterations each) validate the 13 correctness properties defined in the design document
- Unit tests validate specific examples, edge cases, and error conditions
- The DPSS model (task 9 and 20) requires ArchCAD-400K dataset access — request at [huggingface.co/datasets/jackluoluo/ArchCAD](https://huggingface.co/datasets/jackluoluo/ArchCAD) (non-commercial research license, ~3 business day approval)
- DWG integration tests (task 6) require ODA File Converter installed in the CI environment
