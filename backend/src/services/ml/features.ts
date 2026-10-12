/**
 * The exact text the layer-3 classifier sees. Shared by the training corpus
 * generator (ml/generate.ts) and the live scorer, so training and serving can
 * never drift apart.
 *
 * Layer 1 runs first (disguises undone), then PII masking (the server only ever
 * receives masked text), then whitespace is collapsed so the Python and
 * JavaScript tokenisers split words identically.
 */
import { clean, mask } from '@satark/shared';

export function featureText(text: string): string {
  return clean(mask(clean(text).text)).norm.replace(/\s+/g, ' ').trim();
}

/** Same pipeline without layer 1: used only to measure what layer 1 is worth under attack. */
export function featureTextWithoutCleanup(text: string): string {
  return mask(text).toLowerCase().replace(/\s+/g, ' ').trim();
}
