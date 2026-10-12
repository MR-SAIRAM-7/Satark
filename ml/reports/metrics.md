# Layer 3 classifier: measured metrics

Trained 2026-10-12T16:12:12+00:00 · TF-IDF char n-grams (2-5) + logistic regression · C=8 · 12000 features

Corpus: 3860 training and 1167 test messages. The test set uses 41 message scripts that never appear in training.

> These numbers are measured on Satark's synthetic, template-generated corpus (see `ml/README.md`), not on real-world traffic. They show the pipeline works and how layer 1 holds up under attack; real-world precision and recall must be measured on collected messages before any claim is made.

| Threshold | Precision | Recall | False-positive rate | Accuracy |
|---|---|---|---|---|
| Suspicious (≥40) | 96.7% | 94.0% | 3.3% | 95.4% |
| Scam (≥70) | 96.2% | 83.1% | 3.3% | 89.9% |

Confusion matrix at ≥40: TN 563 · FP 19 · FN 35 · TP 550

## Accuracy under attack (recall on disguised held-out scams, ≥40)

| Disguise | With layer 1 clean-up | Without |
|---|---|---|
| combined | 92.8% | 82.6% |
| emoji_padding | 91.8% | 91.8% |
| homoglyphs | 92.8% | 90.3% |
| leetspeak | 92.8% | 91.8% |
| prompt_injection | 100.0% | 100.0% |
| spacing | 92.8% | 92.8% |
| zero_width | 92.8% | 93.8% |
| **All** | **93.7%** | **91.9%** |

## Recall by scam type (held-out scripts, ≥40)

| Scam type | Messages | Recall |
|---|---|---|
| courier | 40 | 100.0% |
| digital_arrest | 80 | 95.0% |
| electricity | 40 | 100.0% |
| family_emergency | 40 | 22.5% |
| investment | 40 | 100.0% |
| job_task | 40 | 100.0% |
| kyc_bank | 80 | 100.0% |
| lottery | 40 | 100.0% |
| malware_apk | 40 | 100.0% |
| phishing_link | 40 | 100.0% |
| remote_access | 40 | 100.0% |
| sim_block | 25 | 100.0% |
| upi_collect | 40 | 100.0% |

## Strongest scam n-grams

`xxxxx` (3.474), `xxx` (2.813), `xxxx` (2.754), `://` (2.13), `ins` (2.02), `htt` (1.858), `ht` (1.858), `ttp` (1.858), `http` (1.858), `http` (1.858), `htt` (1.858), `in` (1.793), `to` (1.79), `000` (1.691), `ins` (1.661)
