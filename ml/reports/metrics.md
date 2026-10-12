# Layer 3 classifier: measured metrics

Trained 2026-10-12T13:51:59+00:00 · TF-IDF char n-grams (2-5) + logistic regression · C=0.5 · 11957 features

Corpus: 3652 training and 1062 test messages. The test set uses 35 message scripts that never appear in training.

> These numbers are measured on Satark's synthetic, template-generated corpus (see `ml/README.md`), not on real-world traffic. They show the pipeline works and how layer 1 holds up under attack; real-world precision and recall must be measured on collected messages before any claim is made.

| Threshold | Precision | Recall | False-positive rate | Accuracy |
|---|---|---|---|---|
| Suspicious (≥40) | 92.7% | 100.0% | 9.7% | 95.7% |
| Scam (≥70) | 100.0% | 68.2% | 0.0% | 82.4% |

Confusion matrix at ≥40: TN 428 · FP 46 · FN 0 · TP 588

## Accuracy under attack (recall on disguised held-out scams, ≥40)

| Disguise | With layer 1 clean-up | Without |
|---|---|---|
| combined | 100.0% | 96.9% |
| emoji_padding | 100.0% | 100.0% |
| homoglyphs | 100.0% | 99.0% |
| leetspeak | 100.0% | 100.0% |
| prompt_injection | 100.0% | 100.0% |
| spacing | 100.0% | 100.0% |
| zero_width | 100.0% | 99.0% |
| **All** | **100.0%** | **99.3%** |

## Recall by scam type (held-out scripts, ≥40)

| Scam type | Messages | Recall |
|---|---|---|
| courier | 40 | 100.0% |
| digital_arrest | 80 | 100.0% |
| electricity | 40 | 100.0% |
| family_emergency | 40 | 100.0% |
| investment | 40 | 100.0% |
| job_task | 40 | 100.0% |
| kyc_bank | 80 | 100.0% |
| lottery | 40 | 100.0% |
| malware_apk | 40 | 100.0% |
| phishing_link | 40 | 100.0% |
| remote_access | 40 | 100.0% |
| sim_block | 28 | 100.0% |
| upi_collect | 40 | 100.0% |

## Strongest scam n-grams

`xxxxx` (1.58), `xxx` (1.191), `xxxx` (1.191), `://` (0.997), `ins` (0.958), `htt` (0.89), `ttp` (0.89), `http` (0.89), `ht` (0.89), `htt` (0.89), `http` (0.89), `to` (0.856), `ins` (0.806), `si` (0.797), `i` (0.749)
