"""
Layer 3 - train the scam classifier and export it for the Node.js backend.

    npm run ml:corpus     # ml/data/*.jsonl from ml/templates.ts
    npm run ml:train      # this script

TF-IDF character n-grams (char_wb, 2-5) + logistic regression. Character
n-grams cope with Telugu, Hindi, Hinglish and the misspellings scammers use,
and every weight is inspectable, so the dashboard can show which fragments
pushed a message towards "scam".

Outputs
  backend/models/classifier.json   weights the backend scores with (no Python at runtime)
  backend/models/parity.json       sklearn probabilities the Node scorer is tested against
  ml/reports/metrics.json|.md      measured precision, recall, false positives, accuracy under attack
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import GroupKFold, GridSearchCV
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "ml" / "data"
MODELS = ROOT / "backend" / "models"
REPORTS = ROOT / "ml" / "reports"

# Must match backend/src/services/ml/classifier.ts.
VECTORIZER = dict(analyzer="char_wb", ngram_range=(3, 5), lowercase=False, sublinear_tf=True, min_df=3, max_features=12000)
# Verdict thresholds from shared/src/rules.json.
SUSPICIOUS, SCAM = 40, 70


def load(name: str) -> list[dict]:
    path = DATA / name
    if not path.exists():
        sys.exit(f"{path} not found: run `npm run ml:corpus` first")
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def rates(y_true, scores, threshold: float) -> dict:
    y_pred = (np.asarray(scores) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="binary", zero_division=0)
    return {
        "threshold": threshold,
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "false_positive_rate": round(float(fp / (fp + tn)) if fp + tn else 0.0, 4),
        "accuracy": round(float((tp + tn) / len(y_true)), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def main() -> None:
    train, test, attack = load("train.jsonl"), load("test.jsonl"), load("attack.jsonl")
    x_train, y_train = [r["x"] for r in train], np.array([r["label"] for r in train])
    x_test, y_test = [r["x"] for r in test], np.array([r["label"] for r in test])

    # Pick C with cross-validation grouped by template, so a script never sits on both sides of a fold.
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(**VECTORIZER)),
        ("lr", LogisticRegression(class_weight="balanced", max_iter=4000, solver="liblinear")),
    ])
    search = GridSearchCV(pipeline, {"lr__C": [0.25, 0.5, 1, 2, 4, 8]}, cv=GroupKFold(n_splits=5),
                          scoring="average_precision", n_jobs=1)
    search.fit(x_train, y_train, groups=[r["template"] for r in train])
    model: Pipeline = search.best_estimator_
    vectorizer: TfidfVectorizer = model.named_steps["tfidf"]
    lr: LogisticRegression = model.named_steps["lr"]
    print(f"best C={search.best_params_['lr__C']}  cv average precision={search.best_score_:.4f}")

    p_test = model.predict_proba(x_test)[:, 1] * 100
    scam_rows = [r for r in test if r["label"] == 1]
    families = sorted({r["family"] for r in scam_rows})
    per_family = {}
    for family in families:
        rows = [r for r in scam_rows if r["family"] == family]
        scores = model.predict_proba([r["x"] for r in rows])[:, 1] * 100
        per_family[family] = {"n": len(rows), "recall_at_suspicious": round(float(np.mean(scores >= SUSPICIOUS)), 4)}

    # Accuracy under attack: the same held-out scams, disguised, scored with and without layer 1.
    with_cleanup = model.predict_proba([r["x"] for r in attack])[:, 1] * 100
    without_cleanup = model.predict_proba([r["x_raw"] for r in attack])[:, 1] * 100
    disguises = sorted({r["disguise"] for r in attack})
    under_attack = {
        name: {
            "n": int(sum(1 for r in attack if r["disguise"] == name)),
            "recall_with_layer1": round(float(np.mean([s >= SUSPICIOUS for s, r in zip(with_cleanup, attack) if r["disguise"] == name])), 4),
            "recall_without_layer1": round(float(np.mean([s >= SUSPICIOUS for s, r in zip(without_cleanup, attack) if r["disguise"] == name])), 4),
        }
        for name in disguises
    }

    names = vectorizer.get_feature_names_out()
    coef = lr.coef_[0]
    order = np.argsort(coef)
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "corpus": {"train": len(train), "test": len(test), "attack": len(attack),
                   "test_templates_unseen_in_training": len({r["template"] for r in test})},
        "model": {"C": search.best_params_["lr__C"], "features": int(len(names)), **{k: str(v) for k, v in VECTORIZER.items()}},
        "cv_average_precision": round(float(search.best_score_), 4),
        "test_average_precision": round(float(average_precision_score(y_test, p_test)), 4),
        "test_at_suspicious": rates(y_test, p_test, SUSPICIOUS),
        "test_at_scam": rates(y_test, p_test, SCAM),
        "recall_by_scam_type": per_family,
        "under_attack": {
            "recall_with_layer1": round(float(np.mean(with_cleanup >= SUSPICIOUS)), 4),
            "recall_without_layer1": round(float(np.mean(without_cleanup >= SUSPICIOUS)), 4),
            "by_disguise": under_attack,
        },
        "top_scam_features": [[names[i], round(float(coef[i]), 3)] for i in order[::-1][:25]],
        "top_genuine_features": [[names[i], round(float(coef[i]), 3)] for i in order[:15]],
    }

    MODELS.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    export = {
        "version": f"tfidf-lr-{datetime.now(timezone.utc):%Y%m%d}",
        "analyzer": "char_wb",
        "ngram_range": list(VECTORIZER["ngram_range"]),
        "sublinear_tf": True,
        "norm": "l2",
        "intercept": float(lr.intercept_[0]),
        # [n-gram, idf, coefficient]: everything the Node scorer needs, in one list.
        "features": [[names[i], round(float(vectorizer.idf_[i]), 7), round(float(coef[i]), 7)] for i in range(len(names))],
        "metrics": {k: metrics[k] for k in ("trained_at", "test_at_suspicious", "test_at_scam", "under_attack", "test_average_precision")},
    }
    (MODELS / "classifier.json").write_text(json.dumps(export, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # Parity set: the Node scorer must reproduce these probabilities.
    sample = test[::9][:100] + attack[::29][:40]
    probs = model.predict_proba([r["x"] for r in sample])[:, 1]
    (MODELS / "parity.json").write_text(json.dumps(
        [{"x": r["x"], "p": round(float(p), 9)} for r, p in zip(sample, probs)], ensure_ascii=False, indent=0), encoding="utf-8")

    (REPORTS / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    (REPORTS / "metrics.md").write_text(render_markdown(metrics), encoding="utf-8")

    s, c = metrics["test_at_suspicious"], metrics["test_at_scam"]
    print(f"test @{SUSPICIOUS}: precision {s['precision']}  recall {s['recall']}  FPR {s['false_positive_rate']}")
    print(f"test @{SCAM}: precision {c['precision']}  recall {c['recall']}  FPR {c['false_positive_rate']}")
    ua = metrics["under_attack"]
    print(f"under attack: recall {ua['recall_with_layer1']} with layer 1, {ua['recall_without_layer1']} without")
    print(f"wrote {MODELS / 'classifier.json'} ({len(names)} features)")


def render_markdown(m: dict) -> str:
    s, c = m["test_at_suspicious"], m["test_at_scam"]
    lines = [
        "# Layer 3 classifier: measured metrics",
        "",
        f"Trained {m['trained_at']} · TF-IDF char n-grams (2-5) + logistic regression · C={m['model']['C']} · {m['model']['features']} features",
        "",
        f"Corpus: {m['corpus']['train']} training and {m['corpus']['test']} test messages. The test set uses "
        f"{m['corpus']['test_templates_unseen_in_training']} message scripts that never appear in training.",
        "",
        "> These numbers are measured on Satark's synthetic, template-generated corpus (see `ml/README.md`), "
        "not on real-world traffic. They show the pipeline works and how layer 1 holds up under attack; "
        "real-world precision and recall must be measured on collected messages before any claim is made.",
        "",
        "| Threshold | Precision | Recall | False-positive rate | Accuracy |",
        "|---|---|---|---|---|",
        f"| Suspicious (≥{s['threshold']}) | {s['precision']:.1%} | {s['recall']:.1%} | {s['false_positive_rate']:.1%} | {s['accuracy']:.1%} |",
        f"| Scam (≥{c['threshold']}) | {c['precision']:.1%} | {c['recall']:.1%} | {c['false_positive_rate']:.1%} | {c['accuracy']:.1%} |",
        "",
        f"Confusion matrix at ≥{s['threshold']}: TN {s['confusion_matrix']['tn']} · FP {s['confusion_matrix']['fp']} · "
        f"FN {s['confusion_matrix']['fn']} · TP {s['confusion_matrix']['tp']}",
        "",
        "## Accuracy under attack (recall on disguised held-out scams, ≥40)",
        "",
        "| Disguise | With layer 1 clean-up | Without |",
        "|---|---|---|",
        *[f"| {k} | {v['recall_with_layer1']:.1%} | {v['recall_without_layer1']:.1%} |" for k, v in m["under_attack"]["by_disguise"].items()],
        f"| **All** | **{m['under_attack']['recall_with_layer1']:.1%}** | **{m['under_attack']['recall_without_layer1']:.1%}** |",
        "",
        "## Recall by scam type (held-out scripts, ≥40)",
        "",
        "| Scam type | Messages | Recall |",
        "|---|---|---|",
        *[f"| {k} | {v['n']} | {v['recall_at_suspicious']:.1%} |" for k, v in m["recall_by_scam_type"].items()],
        "",
        "## Strongest scam n-grams",
        "",
        ", ".join(f"`{f.strip() or '␠'}` ({w})" for f, w in m["top_scam_features"][:15]),
        "",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    main()
