import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { classifier } from '../src/services/ml/classifier';
import { featureText } from '../src/services/ml/features';

const parity = JSON.parse(readFileSync(new URL('../models/parity.json', import.meta.url), 'utf8')) as { x: string; p: number }[];

describe('layer 3 classifier', () => {
  it('reproduces scikit-learn probabilities exactly', () => {
    expect(parity.length).toBeGreaterThan(100);
    for (const { x, p } of parity) expect(classifier().score(x).probability).toBeCloseTo(p, 5);
  });

  it('scores a digital-arrest script high and a family message low', () => {
    const scam = classifier().score(featureText('This is CBI. Your Aadhaar is linked to money laundering. Do not tell anyone, transfer the amount for verification.'));
    const family = classifier().score(featureText('Amma, reached office. Will call you in the evening.'));
    expect(scam.probability).toBeGreaterThan(0.7);
    expect(family.probability).toBeLessThan(0.4);
    expect(scam.top.length).toBeGreaterThan(0);
  });
});
