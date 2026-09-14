// Small, dependency-free validation helpers used by data hooks and web methods.

export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export function requireString(item, field, { max = 500 } = {}) {
  const v = item[field];
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw new ValidationError(`${field} is required`, field);
  }
  if (v.length > max) {
    throw new ValidationError(`${field} must be ${max} characters or fewer`, field);
  }
  item[field] = v.trim();
  return item[field];
}

export function optionalString(item, field, { max = 2000 } = {}) {
  const v = item[field];
  if (v === undefined || v === null || v === '') {
    item[field] = undefined;
    return undefined;
  }
  if (typeof v !== 'string') throw new ValidationError(`${field} must be text`, field);
  if (v.length > max) throw new ValidationError(`${field} must be ${max} characters or fewer`, field);
  item[field] = v.trim();
  return item[field];
}

export function requireOneOf(item, field, allowed) {
  const v = item[field];
  if (!allowed.includes(v)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`, field);
  }
  return v;
}

export function requireDate(item, field, { allowFuture = true } = {}) {
  const d = toDate(item[field]);
  if (!d) throw new ValidationError(`${field} must be a valid date`, field);
  if (!allowFuture && d.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new ValidationError(`${field} cannot be in the future`, field);
  }
  item[field] = d;
  return d;
}

export function requireMoney(item, field, { min = 0, max = 100000 } = {}) {
  const n = typeof item[field] === 'string' ? Number(item[field]) : item[field];
  if (typeof n !== 'number' || Number.isNaN(n)) {
    throw new ValidationError(`${field} must be a number`, field);
  }
  if (n < min || n > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`, field);
  }
  item[field] = Math.round(n * 100) / 100;
  return item[field];
}

export function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isSiteOwner(context) {
  return context && context.userRole === 'siteOwner';
}

export function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
