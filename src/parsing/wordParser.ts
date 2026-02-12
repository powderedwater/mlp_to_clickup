import mammoth from 'mammoth';
import { ParseWordOptions, ParsedWordTemplateResult } from './types';

function normalizeLine(value: string): string {
  return value.replace(/\r/g, '').trimEnd();
}

export async function parseDocxTemplate(
  source: unknown,
  options: ParseWordOptions = {},
): Promise<ParsedWordTemplateResult> {
  const result: ParsedWordTemplateResult = {
    labels: {},
    notes: '',
    missingFieldWarnings: [],
    warnings: [],
    blockingErrors: [],
  };

  if (
    !(source instanceof ArrayBuffer) &&
    !(source instanceof Uint8Array) &&
    !Buffer.isBuffer(source)
  ) {
    result.blockingErrors.push(
      'Invalid input type for Word parser. Expected ArrayBuffer, Uint8Array, or Buffer.',
    );
    return result;
  }

  try {
    const extraction = await mammoth.extractRawText({
      buffer: Buffer.isBuffer(source) ? source : Buffer.from(source),
    });

    const lines = extraction.value
      .split('\n')
      .map(normalizeLine)
      .filter((line) => line.length > 0);

    let notesStartLine = -1;

    lines.forEach((line, index) => {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) {
        return;
      }

      const label = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (!label) {
        return;
      }

      if (label.toLowerCase() === 'notes' && notesStartLine < 0) {
        notesStartLine = index;
      }

      result.labels[label] = value;
    });

    if (notesStartLine >= 0) {
      const [firstLine, ...remainingLines] = lines.slice(notesStartLine);
      const inlineNotes = firstLine.slice(firstLine.indexOf(':') + 1).trim();
      result.notes = [inlineNotes, ...remainingLines].filter(Boolean).join('\n').trim();
      result.labels.Notes = result.notes;
    }

    const requiredFields = options.requiredFields ?? [];
    requiredFields.forEach((requiredField) => {
      if (!result.labels[requiredField] || !result.labels[requiredField].trim()) {
        result.missingFieldWarnings.push(
          `Missing template field value for "${requiredField}".`,
        );
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.blockingErrors.push(`Unable to parse .docx template: ${message}`);
  }

  return result;
}
