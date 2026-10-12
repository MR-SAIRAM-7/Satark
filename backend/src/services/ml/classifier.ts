/**
 * Layer 3 - scam classifier, scored in Node from the JSON that ml/train.py
 * exports. Reproduces scikit-learn's TfidfVectorizer(analyzer="char_wb",
 * sublinear_tf=True, norm="l2") + LogisticRegression exactly; a parity test
 * checks the probabilities against scikit-learn's own.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ModelFile {
  version: string;
  ngram_range: [number, number];
  intercept: number;
  features: [string, number, number][];
  metrics: Record<string, unknown>;
}

export interface MlResult {
  probability: number;
  /** The n-grams that pushed hardest towards "scam": the explainable part of layer 3. */
  top: { feature: string; weight: number }[];
}

// backend/models, from the source file (src/services/ml) or from the production build (dist).
const here = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = [join(here, '../../../models/classifier.json'), join(here, '../models/classifier.json')].find((p) => existsSync(p)) ?? join(here, '../../../models/classifier.json');

export class TfidfLogistic {
  readonly version: string;
  readonly metrics: Record<string, unknown>;
  private readonly weights = new Map<string, { idf: number; coef: number }>();
  private readonly minN: number;
  private readonly maxN: number;
  private readonly intercept: number;

  constructor(model: ModelFile) {
    this.version = model.version;
    this.metrics = model.metrics;
    [this.minN, this.maxN] = model.ngram_range;
    this.intercept = model.intercept;
    for (const [ngram, idf, coef] of model.features) this.weights.set(ngram, { idf, coef });
  }

  static load(path = MODEL_PATH): TfidfLogistic {
    return new TfidfLogistic(JSON.parse(readFileSync(path, 'utf8')) as ModelFile);
  }

  /** scikit-learn's _char_wb_ngrams, on code points (Python string semantics). */
  ngrams(text: string): string[] {
    const out: string[] = [];
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const w = Array.from(` ${word} `);
      for (let n = this.minN; n <= this.maxN; n++) {
        let offset = 0;
        out.push(w.slice(offset, offset + n).join(''));
        while (offset + n < w.length) {
          offset += 1;
          out.push(w.slice(offset, offset + n).join(''));
        }
        if (offset === 0) break; // a word shorter than n is counted once
      }
    }
    return out;
  }

  /** L2-normalised TF-IDF vector, used to cluster similar reports into campaigns. */
  vector(text: string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const g of this.ngrams(text)) if (this.weights.has(g)) counts.set(g, (counts.get(g) ?? 0) + 1);
    const vec = new Map([...counts].map(([g, tf]) => [g, (1 + Math.log(tf)) * this.weights.get(g)!.idf]));
    const norm = Math.sqrt([...vec.values()].reduce((s, v) => s + v * v, 0)) || 1;
    for (const [g, v] of vec) vec.set(g, v / norm);
    return vec;
  }

  /** `text` must already be featureText() output. */
  score(text: string): MlResult {
    const counts = new Map<string, number>();
    for (const g of this.ngrams(text)) if (this.weights.has(g)) counts.set(g, (counts.get(g) ?? 0) + 1);

    const values = [...counts].map(([g, tf]) => {
      const { idf, coef } = this.weights.get(g)!;
      return { g, v: (1 + Math.log(tf)) * idf, coef };
    });
    const norm = Math.sqrt(values.reduce((sum, x) => sum + x.v * x.v, 0)) || 1;

    let z = this.intercept;
    const contributions: { feature: string; weight: number }[] = [];
    for (const { g, v, coef } of values) {
      const c = (v / norm) * coef;
      z += c;
      contributions.push({ feature: g, weight: c });
    }

    const top = contributions
      .filter((c) => c.weight > 0 && c.feature.trim().length >= 3)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 8)
      .map((c) => ({ feature: c.feature.trim(), weight: Math.round(c.weight * 1000) / 1000 }));

    return { probability: 1 / (1 + Math.exp(-z)), top };
  }
}

let instance: TfidfLogistic | null = null;
export const classifier = () => (instance ??= TfidfLogistic.load());
