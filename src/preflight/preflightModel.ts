import {
  ParsedExcelResult,
  ParsedWordTemplateResult,
  PreflightOptions,
  PreflightResult,
} from '../parsing/types';

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function buildPreflightModel(
  excel: ParsedExcelResult,
  word: ParsedWordTemplateResult,
  options: PreflightOptions = {},
): PreflightResult {
  const blockingErrors = uniq([
    ...excel.blockingErrors,
    ...word.blockingErrors,
  ]);

  const unknownMediaTypes = uniq(excel.unknownMediaTypes);

  const knownMediaTypes = new Set(
    (options.knownMediaTypes ?? []).map((value) => value.trim().toLowerCase()),
  );

  if (knownMediaTypes.size > 0) {
    excel.rows.forEach((row) => {
      if (!row.lectureType) {
        return;
      }

      if (!knownMediaTypes.has(row.lectureType.trim().toLowerCase())) {
        if (!unknownMediaTypes.includes(row.lectureType)) {
          unknownMediaTypes.push(row.lectureType);
        }
      }
    });
  }

  const missingMetadataWarnings = uniq([
    ...word.missingFieldWarnings,
    ...excel.warnings.filter((warning) => warning.toLowerCase().includes('missing')),
  ]);

  const requiredWordFields = options.requiredWordFields ?? [];
  requiredWordFields.forEach((field) => {
    if (!word.labels[field] || !word.labels[field].trim()) {
      const warning = `Missing metadata for required Word field "${field}".`;
      if (!missingMetadataWarnings.includes(warning)) {
        missingMetadataWarnings.push(warning);
      }
    }
  });

  return {
    validVideoCount: excel.rows.length,
    unknownMediaTypes,
    missingMetadataWarnings,
    blockingErrors,
  };
}
