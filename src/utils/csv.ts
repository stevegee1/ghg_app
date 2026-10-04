/**
 * Minimal RFC 4180 CSV parser: comma separated, double-quoted fields with "" escapes,
 * CRLF or LF line endings, optional UTF-8 byte order mark. Blank lines are skipped.
 */
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

export interface CsvTable {
  headers: string[];
  /** Data rows keyed by header, with the 1-based line number in the source file. */
  rows: { line: number; values: Record<string, string> }[];
}

function parseRecords(text: string): { line: number; fields: string[] }[] {
  const records: { line: number; fields: string[] }[] = [];
  let field = '';
  let fields: string[] = [];
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === '\n') line++;
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      if (field.length > 0) {
        throw new CsvParseError(`Line ${line}: unexpected quote inside an unquoted field.`);
      }
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = '';
      line++;
      recordLine = line;
    } else {
      field += ch;
    }
  }

  if (inQuotes) {
    throw new CsvParseError(`Line ${recordLine}: a quoted field is not closed.`);
  }
  if (field.length > 0 || fields.length > 0) {
    fields.push(field);
    records.push({ line: recordLine, fields });
  }

  return records.filter((r) => !(r.fields.length === 1 && r.fields[0].trim() === ''));
}

export function parseCsv(text: string, options: { maxRows: number }): CsvTable {
  const records = parseRecords(text.replace(/^﻿/, ''));
  if (records.length === 0) {
    throw new CsvParseError('The file is empty.');
  }

  const headers = records[0].fields.map((h) => h.trim().toLowerCase());
  const duplicate = headers.find((h, i) => headers.indexOf(h) !== i);
  if (duplicate) {
    throw new CsvParseError(`Column "${duplicate}" appears more than once.`);
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length === 0) {
    throw new CsvParseError('The file has a header row but no data rows.');
  }
  if (dataRecords.length > options.maxRows) {
    throw new CsvParseError(`The file has ${dataRecords.length} rows; the limit is ${options.maxRows}.`);
  }

  const rows = dataRecords.map((r) => {
    if (r.fields.length !== headers.length) {
      throw new CsvParseError(`Line ${r.line}: expected ${headers.length} columns, found ${r.fields.length}.`);
    }
    const values: Record<string, string> = {};
    headers.forEach((h, i) => {
      values[h] = r.fields[i].trim();
    });
    return { line: r.line, values };
  });

  return { headers, rows };
}
