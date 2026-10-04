const tonnesFormat = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numberFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

/** kg CO2e (decimal string from the API) shown as tonnes with one decimal place. */
export function formatTonnes(kgCo2e: string): string {
  return tonnesFormat.format(Number(kgCo2e) / 1000);
}

export function formatLitres(litres: string): string {
  return numberFormat.format(Number(litres));
}

export function formatHours(hours: string): string {
  return numberFormat.format(Number(hours));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

/** ISO date (YYYY-MM-DD) in UTC. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
