# Layer 3: scam classifier

TF-IDF character n-grams (`char_wb`, 3-5) + logistic regression, trained with scikit-learn and scored in Node.js from the exported weights (no Python at runtime). Character n-grams cope with Telugu, Hindi, Hinglish and Tenglish, and with the misspellings scammers use; every weight is inspectable, so the dashboard can show which fragments pushed a message towards "scam".

```bash
pip install -r ml/requirements.txt
npm run ml:corpus     # ml/data/{train,test,attack}.jsonl  (ml/generate.ts)
npm run ml:train      # backend/models/classifier.json, backend/models/parity.json, ml/reports/metrics.{json,md}
```

## The corpus

There is no labelled Indian scam corpus we could ship, so `ml/templates.ts` holds message scripts written from public advisories (I4C / cybercrime.gov.in, PIB Fact Check, RBI, TGCSB) and genuine formats (bank OTPs and debit alerts with TRAI headers, bills, deliveries, family chats in five languages, and **awareness messages that quote scam phrases**, the hardest negatives). `generate.ts` fills the slots with a seeded random generator, so the same corpus comes out every time. Every number, UPI ID and domain is invented.

- **Split by template:** about 22% of the scripts in every family are held out entirely, so the test set measures scripts the model has never seen, which is how new scam wording arrives.
- **Same preprocessing as serving:** each row carries `x = featureText(text)` from `backend/src/services/ml/features.ts` (layer 1 clean-up, then PII masking), the exact input the live scorer sees.
- **Under attack:** a third of the held-out scams are rewritten with look-alike letters, zero-width characters, spaced letters, leetspeak, emoji padding and prompt injection, then scored with and without layer 1.

## Results

See [`reports/metrics.md`](reports/metrics.md) (generated). These are measured on the synthetic corpus, so they show the pipeline and the defences work; they are **not** a claim about real-world accuracy. Replace or extend the corpus with collected messages before quoting any number publicly.

How the backend uses the score: probability × 100, scaled by the same sender-trust factor as the Kill Chain (registered headers 0.5, saved contacts 0.7, awareness messages × 0.4). When no other layer has found anything, layer 3 is capped at 69, so on its own it can mark a message "suspicious" but never trigger a red alert.

## Parity

`backend/test/ml.test.ts` checks that the Node scorer reproduces scikit-learn's probabilities (to 5 decimal places) on 140 messages from `backend/models/parity.json`, including Telugu text and emoji.
