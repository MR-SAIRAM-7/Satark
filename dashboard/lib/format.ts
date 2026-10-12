import { FIR_STAGES, formatInr, SCAM_TYPES, type FirStageId, type ScamType } from '@satark/shared';
import { formatDistanceToNowStrict } from 'date-fns';

export { formatInr };

/**
 * Colour follows the scam type, never its rank: six types own the validated
 * categorical slots (dark steps, in slot order); everything else folds into
 * "Other". The map is an all-pairs chart, so only the first three types keep
 * their colour there.
 */
export const SERIES: { type: ScamType; color: string }[] = [
  { type: 'investment', color: '#3987e5' },
  { type: 'digital_arrest', color: '#d95926' },
  { type: 'kyc_bank', color: '#199e70' },
  { type: 'electricity', color: '#c98500' },
  { type: 'courier', color: '#d55181' },
  { type: 'malware_apk', color: '#008300' },
];
export const OTHER_COLOR = '#6f6e69';
export const MAP_TYPES = SERIES.slice(0, 3);

export const seriesColor = (type: string, slots = SERIES) => slots.find((s) => s.type === type)?.color ?? OTHER_COLOR;
export const seriesKey = (type: string, slots = SERIES) => (slots.some((s) => s.type === type) ? type : 'other');

export const IOC_LABEL: Record<string, string> = { phone: 'Phone', upi: 'UPI ID', domain: 'Domain' };

export const scamLabel = (type: string) => SCAM_TYPES[type as ScamType]?.label.en ?? 'Other';

export const STAGE_LABEL: Record<FirStageId, string> = {
  kit_ready: 'Kit ready',
  helpline_1930: '1930 called',
  portal_filed: 'Portal filed',
  acknowledged: 'Acknowledged',
  bank_hold: 'Bank hold',
  zero_fir: 'FIR registered',
  io_assigned: 'IO assigned',
};
export const stageIndex = (stage: FirStageId) => FIR_STAGES.indexOf(stage);
export { FIR_STAGES };

/** ₹1.85 Cr / ₹4.9 L / ₹12,500 */
export function compactInr(amount: number): string {
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)} Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)} L`;
  return formatInr(amount);
}

export const ago = (date: string | number | Date) => formatDistanceToNowStrict(new Date(date), { addSuffix: true });

export const clock = (date: string | number | Date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const dayTime = (date: string | number | Date) =>
  new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
