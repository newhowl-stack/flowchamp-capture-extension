# FlowChamp Capture Extension - Developer Notes

Public repo: https://github.com/newhowl-stack/flowchamp-capture-extension

## What this extension does

This Chrome extension captures trainer lead data from a visible LinkedIn profile page, lets the user validate the captured fields, then sends the profile to the FlowChamp backend for enrichment/storage.

Current capture fields include:

- full name
- LinkedIn URL
- profile image URL
- headline
- title
- experience summary
- location
- current employer
- company, for self-employed/founder/owner-style profiles
- gym company
- notes, including former gyms and credentials/certifications when detected

## Local install for testing

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select the repository folder.
6. Open a LinkedIn profile page.
7. Open the FlowChamp Capture extension.
8. Click Capture.
9. Review the fields.
10. Click Enrich to send the captured profile to the backend.

## Backend configuration

The extension is currently pointed at the FlowChamp backend URL used in development. The popup settings store the backend URL and API token in Chrome storage so they persist in the browser.

For production, do not hardcode secrets in the extension. Use a proper auth/session model or a short-lived token issued after login.

## Current business rules

The extension tries to distinguish regular employment from owned businesses.

If a profile indicates a self-employed, founder, co-founder, owner, director, or similar owner-style role, the extension should:

- set `current_employer` to `Self Employed`
- put the owned business name in `company`

Examples:

- `Self-Employed, Founder at Strength & Soul` -> employer `Self Employed`, company `Strength & Soul`
- `Co-Founder at Some Studio` -> employer `Self Employed`, company `Some Studio`

## Known limits

LinkedIn changes its DOM often, and profile layouts vary by account, region, and login state. The capture logic should be treated as a practical parser, not a guaranteed LinkedIn API replacement.

The next production step should be backend-first: stable database, authenticated API, server-side duplicate handling, enrichment status tracking, and observability around failed captures/enrichments.
