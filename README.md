# FlowChamp Capture Extension

Chrome extension for capturing LinkedIn trainer leads into the FlowChamp / TrainerSource lead enrichment workflow.

## What it does

- Captures visible LinkedIn profile data from the active tab.
- Shows the captured profile in editable fields before submission.
- Separates regular employers from owner-style/self-employed companies.
- Captures profile image URL, title, current employer, owned company, location, former gyms, and certifications where visible.
- Sends the validated profile to the FlowChamp backend for enrichment and storage.

## Install locally

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select this repository folder.
6. Open a LinkedIn profile.
7. Open the FlowChamp Capture extension.
8. Click Capture, review the fields, then click Enrich.

## Files

- `manifest.json` - Chrome extension manifest.
- `content.js` - LinkedIn profile capture and parsing logic.
- `popup.html` - Extension popup UI.
- `popup.css` - Popup styles.
- `popup.js` - Popup state, settings, and backend submission.
- `DEVELOPER_NOTES.md` - Handoff notes and current business rules.
- `tests/parser-smoke.js` - Lightweight parser regression test for known LinkedIn profile examples.

## Smoke test

Run from the repo root:

```bash
node tests/parser-smoke.js
```

The smoke test checks the parser against the main capture bugs fixed so far, including self-employed/founder profiles, owned-company detection, profile image selection, former gyms, and certification notes.

## Backend note

This repo only contains the Chrome extension. The backend, database, and n8n workflow live in the broader FlowChamp / TrainerSource project.

Do not hardcode production secrets in the extension. Production auth should use a proper login/session or short-lived token issued by the backend.
