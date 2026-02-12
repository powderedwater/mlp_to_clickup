import * as XLSX from 'xlsx';
import {
  HeaderMappingDefaults,
  ParseExcelOptions,
  ParsedExcelResult,
} from './types';

export const VIDEO_ROW_REGEX = /^\s*(?:M\s*)?\d+\.\d+\s*$/;

const DEFAULT_HEADERS: HeaderMappingDefaults = {
  videoNumber: 'Video Number',
  lectureName: 'Lecture Name',
  lectureType: 'Lecture Type',
};

function normalizeCellValue(value: unknown): string {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function isSeparatorRow(values: string[]): boolean {
  const joined = values.join(' ').trim();
  if (!joined) {
    return true;
  }

  return /^[-–—_=\s|]{3,}$/.test(joined);
}

function normalizeCanonicalHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeVideoNumber(
  value: string,
  enforceLeadingM: boolean,
): string {
  const collapsed = value.replace(/\s+/g, '');

  if (!enforceLeadingM || !collapsed) {
    return collapsed;
  }

  if (/^M/i.test(collapsed)) {
    return `M${collapsed.slice(1)}`;
  }

  return `M${collapsed}`;
}

export function parseExcelWorkbook(
  source: unknown,
  options: ParseExcelOptions = {},
): ParsedExcelResult {
  const result: ParsedExcelResult = {
    headerMap: {},
    rows: [],
    skippedRowIndexes: [],
    unknownMediaTypes: [],
    missingRequiredColumns: [],
    warnings: [],
    blockingErrors: [],
  };

  if (
    !(source instanceof ArrayBuffer) &&
    !(source instanceof Uint8Array)
  ) {
    result.blockingErrors.push(
      'Invalid input type for Excel parser. Expected ArrayBuffer or Uint8Array.',
    );
    return result;
  }

  const binarySource = source instanceof Uint8Array ? source : new Uint8Array(source);

  const headerDefaults: HeaderMappingDefaults = {
    ...DEFAULT_HEADERS,
    ...options.headerDefaults,
  };

  const canonicalToDisplay: Record<string, string> = {
    videoNumber: options.headerRemap?.videoNumber ?? headerDefaults.videoNumber,
    lectureName: options.headerRemap?.lectureName ?? headerDefaults.lectureName,
    lectureType: options.headerRemap?.lectureType ?? headerDefaults.lectureType,
  };

  const workbook = XLSX.read(binarySource, { type: 'array' });
  const selectedSheetName = options.sheetName ?? workbook.SheetNames[0];

  if (!selectedSheetName || !workbook.Sheets[selectedSheetName]) {
    result.blockingErrors.push('No worksheet was found in the provided Excel file.');
    return result;
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  const table: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    blankrows: false,
    raw: false,
  });

  if (table.length === 0) {
    result.blockingErrors.push('Worksheet is empty.');
    return result;
  }

  const headerRow = (table[0] ?? []).map(normalizeCellValue);
  const canonicalLookup: Record<string, number> = {};

  headerRow.forEach((header, index) => {
    const normalized = normalizeCanonicalHeader(header);
    if (!normalized) {
      return;
    }

    if (normalized === normalizeCanonicalHeader(canonicalToDisplay.videoNumber)) {
      canonicalLookup.videoNumber = index;
      result.headerMap.videoNumber = header;
    }
    if (normalized === normalizeCanonicalHeader(canonicalToDisplay.lectureName)) {
      canonicalLookup.lectureName = index;
      result.headerMap.lectureName = header;
    }
    if (normalized === normalizeCanonicalHeader(canonicalToDisplay.lectureType)) {
      canonicalLookup.lectureType = index;
      result.headerMap.lectureType = header;
    }
  });

  for (const canonicalKey of ['videoNumber', 'lectureName', 'lectureType']) {
    if (canonicalLookup[canonicalKey] == null) {
      result.missingRequiredColumns.push(canonicalToDisplay[canonicalKey]);
    }
  }

  if (result.missingRequiredColumns.length > 0) {
    result.blockingErrors.push(
      `Missing required Excel column(s): ${result.missingRequiredColumns.join(', ')}`,
    );
    return result;
  }

  const knownMediaTypes = new Set(
    (options.knownMediaTypes ?? []).map((mediaType) =>
      normalizeCanonicalHeader(mediaType),
    ),
  );

  for (let rowIdx = 1; rowIdx < table.length; rowIdx += 1) {
    const row = table[rowIdx] ?? [];
    const normalizedCells = row.map(normalizeCellValue);

    if (isSeparatorRow(normalizedCells)) {
      result.skippedRowIndexes.push(rowIdx + 1);
      continue;
    }

    const videoNumber = normalizeCellValue(row[canonicalLookup.videoNumber]);
    const lectureName = normalizeCellValue(row[canonicalLookup.lectureName]);
    const lectureType = normalizeCellValue(row[canonicalLookup.lectureType]);

    if (!videoNumber && !lectureName && !lectureType) {
      result.skippedRowIndexes.push(rowIdx + 1);
      continue;
    }

    if (!VIDEO_ROW_REGEX.test(videoNumber)) {
      result.warnings.push(
        `Row ${rowIdx + 1} skipped because video number does not match expected pattern: "${videoNumber}".`,
      );
      result.skippedRowIndexes.push(rowIdx + 1);
      continue;
    }

    if (lectureType) {
      const normalizedType = normalizeCanonicalHeader(lectureType);
      if (knownMediaTypes.size > 0 && !knownMediaTypes.has(normalizedType)) {
        if (!result.unknownMediaTypes.includes(lectureType)) {
          result.unknownMediaTypes.push(lectureType);
        }
      }
    }

    result.rows.push({
      rowIndex: rowIdx + 1,
      videoNumberRaw: videoNumber,
      videoNumberNormalized: normalizeVideoNumber(
        videoNumber,
        options.enforceLeadingMOnNormalizedNumber ?? true,
      ),
      lectureName,
      lectureType,
      source: {
        [canonicalToDisplay.videoNumber]: videoNumber,
        [canonicalToDisplay.lectureName]: lectureName,
        [canonicalToDisplay.lectureType]: lectureType,
      },
    });
  }

  return result;
}
