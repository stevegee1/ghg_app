import { Prisma } from '@prisma/client';

/**
 * Turns a provider's own message format into the standard Fleet schema, using a mapping an
 * administrator configures per provider. No device-specific code: a new tracker is a new mapping.
 *
 * Unit conversions use exact definitions: US gallon 3.785411784 L, imperial gallon 4.54609 L,
 * mile 1.609344 km, foot 0.3048 m.
 */

/** A factor starting with "/" divides, so minutes and seconds convert to hours exactly. */
const DURATION_UNITS = { hour: '1', minute: '/60', second: '/3600' } as const;
const VOLUME_UNITS = { litre: '1', millilitre: '0.001', us_gallon: '3.785411784', imperial_gallon: '4.54609' } as const;
const DISTANCE_UNITS = { kilometre: '1', metre: '0.001', mile: '1.609344' } as const;
const ALTITUDE_UNITS = { metre: '1', foot: '0.3048' } as const;
const LEVEL_UNITS = { percent: '1', fraction: '100' } as const;
const TIME_FORMATS = ['iso8601', 'epoch_seconds', 'epoch_millis'] as const;

type UnitTable = Record<string, string>;

/** Standard-schema numeric fields a mapping can fill, with their unit tables and decimal places. */
const NUMERIC_FIELDS: Record<string, { units: UnitTable | null; places: number }> = {
  cumulativeOperatingHours: { units: DURATION_UNITS, places: 2 },
  cumulativeIdleHours: { units: DURATION_UNITS, places: 2 },
  cumulativeFuelUsedLitres: { units: VOLUME_UNITS, places: 3 },
  fuelRemainingPercent: { units: LEVEL_UNITS, places: 2 },
  odometerKm: { units: DISTANCE_UNITS, places: 2 },
  latitude: { units: null, places: 6 },
  longitude: { units: null, places: 6 },
  altitudeM: { units: ALTITUDE_UNITS, places: 2 },
};

export interface FieldMappingConfig {
  /** Where the list of messages is in a request body; omit when the body is one message or an array of them */
  messagesPath?: string | null;
  deviceIdPath: string;
  observedAt: { path: string; format: (typeof TIME_FORMATS)[number] };
  fields: Record<string, { path: string; unit?: string; trueValues?: (string | number | boolean)[] }>;
  faultCodes?: { path: string; codePath: string; severityPath?: string; descriptionPath?: string } | null;
}

export class FieldMappingError extends Error {
  constructor(public problems: string[]) {
    super(`The field mapping is not valid: ${problems.join(' ')}`);
    this.name = 'FieldMappingError';
  }
}

const PATH_PATTERN = /^[A-Za-z0-9_$-]+(\[\d+\])*(\.[A-Za-z0-9_$-]+(\[\d+\])*)*$/;

/** Reads "a.b[0].c" from an object. Returns undefined when any step is missing. */
export function readPath(source: unknown, path: string): unknown {
  let current: unknown = source;
  for (const part of path.split('.')) {
    const match = /^([^[]+)((\[\d+\])*)$/.exec(part);
    if (!match) return undefined;
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[match[1]];
    for (const idx of match[2].match(/\d+/g) ?? []) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(idx)];
    }
  }
  return current;
}

/** Checks a mapping before it is saved, listing every problem at once. */
export function validateFieldMapping(input: unknown): FieldMappingConfig {
  const problems: string[] = [];
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new FieldMappingError(['The mapping must be a JSON object.']);
  const m = input as Record<string, unknown>;
  const checkPath = (value: unknown, label: string, required = true) => {
    if (value === undefined || value === null || value === '') {
      if (required) problems.push(`${label} is required.`);
      return;
    }
    if (typeof value !== 'string' || !PATH_PATTERN.test(value)) problems.push(`${label} must be a path like "data.engine.hours" or "readings[0].value".`);
  };

  checkPath(m.messagesPath, 'messagesPath', false);
  checkPath(m.deviceIdPath, 'deviceIdPath');
  const observed = m.observedAt as Record<string, unknown> | undefined;
  if (!observed || typeof observed !== 'object') problems.push('observedAt is required.');
  else {
    checkPath(observed.path, 'observedAt.path');
    if (!TIME_FORMATS.includes(observed.format as (typeof TIME_FORMATS)[number])) problems.push(`observedAt.format must be one of: ${TIME_FORMATS.join(', ')}.`);
  }

  const fields = m.fields as Record<string, Record<string, unknown>> | undefined;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) problems.push('fields is required.');
  else {
    for (const [name, spec] of Object.entries(fields)) {
      if (name === 'engineRunning') {
        checkPath(spec?.path, 'fields.engineRunning.path');
        if (spec?.trueValues !== undefined && !Array.isArray(spec.trueValues)) problems.push('fields.engineRunning.trueValues must be a list.');
        continue;
      }
      const target = NUMERIC_FIELDS[name];
      if (!target) {
        problems.push(`fields.${name} is not a field of the standard schema.`);
        continue;
      }
      checkPath(spec?.path, `fields.${name}.path`);
      if (target.units) {
        if (!spec?.unit || !(spec.unit as string) || !Object.prototype.hasOwnProperty.call(target.units, spec.unit as string)) {
          problems.push(`fields.${name}.unit must be one of: ${Object.keys(target.units).join(', ')}.`);
        }
      } else if (spec?.unit !== undefined) {
        problems.push(`fields.${name} takes no unit (decimal degrees).`);
      }
    }
    if ((fields.latitude === undefined) !== (fields.longitude === undefined)) problems.push('Map both latitude and longitude, or neither.');
  }

  const faults = m.faultCodes as Record<string, unknown> | null | undefined;
  if (faults !== undefined && faults !== null) {
    checkPath(faults.path, 'faultCodes.path');
    checkPath(faults.codePath, 'faultCodes.codePath');
    checkPath(faults.severityPath, 'faultCodes.severityPath', false);
    checkPath(faults.descriptionPath, 'faultCodes.descriptionPath', false);
  }

  if (problems.length > 0) throw new FieldMappingError(problems);
  return m as unknown as FieldMappingConfig;
}

/** The individual messages in a request body. */
export function extractMessages(mapping: FieldMappingConfig, body: unknown): unknown[] {
  const container = mapping.messagesPath ? readPath(body, mapping.messagesPath) : body;
  if (Array.isArray(container)) return container;
  if (typeof container === 'object' && container !== null) return [container];
  throw new Error(mapping.messagesPath ? `No messages found at ${mapping.messagesPath}.` : 'The body must be a message or a list of messages.');
}

function textOrNull(value: unknown): string | null {
  return value === undefined || value === null || value === '' ? null : String(value);
}

function toDecimal(value: unknown, label: string): Prisma.Decimal {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(text)) throw new Error(`${label} is not a number.`);
  return new Prisma.Decimal(text);
}

function toObservedAt(value: unknown, format: FieldMappingConfig['observedAt']['format']): string {
  if (format === 'iso8601') {
    if (typeof value !== 'string') throw new Error('The timestamp is not text.');
    return value;
  }
  const n = toDecimal(value, 'The timestamp');
  const millis = format === 'epoch_seconds' ? n.mul(1000) : n;
  const date = new Date(millis.toNumber());
  if (Number.isNaN(date.getTime())) throw new Error('The timestamp is not a valid time.');
  return date.toISOString();
}

/**
 * Converts one provider message to a standard-schema snapshot (without the asset tag, which comes
 * from the device binding). Throws with a reason when the message cannot be read.
 */
export function applyFieldMapping(mapping: FieldMappingConfig, message: unknown): { externalDeviceId: string; snapshot: Record<string, unknown> } {
  const deviceId = readPath(message, mapping.deviceIdPath);
  if ((typeof deviceId !== 'string' && typeof deviceId !== 'number') || String(deviceId).trim() === '') {
    throw new Error(`No device identifier at ${mapping.deviceIdPath}.`);
  }
  const observedRaw = readPath(message, mapping.observedAt.path);
  if (observedRaw === undefined || observedRaw === null) throw new Error(`No timestamp at ${mapping.observedAt.path}.`);

  const snapshot: Record<string, unknown> = { observedAt: toObservedAt(observedRaw, mapping.observedAt.format) };
  const location: Record<string, string> = {};

  for (const [name, spec] of Object.entries(mapping.fields)) {
    const raw = readPath(message, spec.path);
    if (raw === undefined || raw === null || raw === '') continue;
    if (name === 'engineRunning') {
      const truthy = spec.trueValues ?? [true, 1, '1', 'true', 'on', 'ON', 'running'];
      snapshot.engineRunning = truthy.some((t) => t === raw || String(t) === String(raw));
      continue;
    }
    const target = NUMERIC_FIELDS[name];
    const factor = target.units ? (target.units as UnitTable)[spec.unit!] : '1';
    const parsed = toDecimal(raw, `${spec.path}`);
    const converted = factor.startsWith('/') ? parsed.div(factor.slice(1)) : parsed.mul(factor);
    const value = converted.toDecimalPlaces(target.places, Prisma.Decimal.ROUND_HALF_UP).toFixed(target.places);
    if (name === 'latitude' || name === 'longitude' || name === 'altitudeM') location[name] = value;
    else snapshot[name] = value;
  }
  if (Object.keys(location).length > 0) snapshot.location = location;

  if (mapping.faultCodes) {
    const list = readPath(message, mapping.faultCodes.path);
    if (Array.isArray(list)) {
      const fc = mapping.faultCodes;
      snapshot.faultCodes = list.map((f) => ({
        code: String(readPath(f, fc.codePath) ?? ''),
        severity: fc.severityPath ? textOrNull(readPath(f, fc.severityPath)) : null,
        description: fc.descriptionPath ? textOrNull(readPath(f, fc.descriptionPath)) : null,
      }));
    }
  }

  return { externalDeviceId: String(deviceId).trim(), snapshot };
}
