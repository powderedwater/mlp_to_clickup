export type ExcelSource = ArrayBuffer | Uint8Array | Buffer;

export interface HeaderMappingDefaults {
  videoNumber: string;
  lectureName: string;
  lectureType: string;
}

export interface HeaderRemap {
  [canonicalHeader: string]: string;
}

export interface ParsedVideoRow {
  rowIndex: number;
  videoNumberRaw: string;
  videoNumberNormalized: string;
  lectureName: string;
  lectureType: string;
  source: Record<string, string>;
}

export interface ParsedExcelResult {
  headerMap: Record<string, string>;
  rows: ParsedVideoRow[];
  skippedRowIndexes: number[];
  unknownMediaTypes: string[];
  missingRequiredColumns: string[];
  warnings: string[];
  blockingErrors: string[];
}

export interface ParseExcelOptions {
  sheetName?: string;
  headerDefaults?: Partial<HeaderMappingDefaults>;
  headerRemap?: HeaderRemap;
  knownMediaTypes?: string[];
  enforceLeadingMOnNormalizedNumber?: boolean;
}

export interface ParsedWordTemplateResult {
  labels: Record<string, string>;
  notes: string;
  missingFieldWarnings: string[];
  warnings: string[];
  blockingErrors: string[];
}

export interface ParseWordOptions {
  requiredFields?: string[];
}

export interface PreflightResult {
  validVideoCount: number;
  unknownMediaTypes: string[];
  missingMetadataWarnings: string[];
  blockingErrors: string[];
}

export interface PreflightOptions {
  knownMediaTypes?: string[];
  requiredWordFields?: string[];
}
