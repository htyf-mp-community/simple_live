export function asT<T>(value: any, defaultValue: T): T {
  return value !== undefined && value !== null ? value : defaultValue;
} 