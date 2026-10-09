# Priority 11–12 Implementation Notes

## Priority 11 — Evidence-linked research assistant
- Added `/evidence` page and `/evidence/sources`, `/evidence/answer` API routes.
- The source bundle is intentionally limited to local project artifacts: `metrics.json`, training metadata in `export.json`, README, and explicit responsible-use constraints.
- When a configured AI provider is available, the assistant is instructed to cite source IDs (for example `[S1]`), distinguish supported facts from interpretation, and abstain when the bundle does not support an answer. Provider failures fall back to a transparent unavailable message.
- The page makes clear that this is not an external medical-literature search and that AI-generated text is not a validated medical interpretation.

## Priority 12 — Privacy, audit and reproducibility
- Added `/provenance` with SHA-256 hashes and byte sizes for the model, dataset, evaluation export, and relevant source files. It does not return filesystem paths, patient inputs, API keys, or conversation content.
- Added browser-local action audit records for page open, question submission, export, and clear actions. Records contain event names and timestamps only, are capped at 200 entries, can be exported, and can be cleared. They are not sent to the server.
- Updated generated report metadata to schema 1.1 and included a unique case reference and model artifact hash, with a note explaining that a hash does not prove the supplied prediction came from that artifact or establish clinical validity.
- No database, cloud storage, public report URL, account system, or automatic upload was added.

## Limitations
- Source grounding is only as complete as the local project artifacts; the page does not search external publications.
- Browser-local audit records can be removed by clearing browser storage and are not a tamper-proof compliance log.
- Hashes identify artifact bytes but do not capture every runtime dependency, environment variable, random state, or exact prediction input. Full reproducibility is not claimed.
- Not clinically validated; not for diagnosis or treatment.
