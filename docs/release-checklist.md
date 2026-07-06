# Release Checklist

## Local checks

- Run `npm test`.
- Run `npm run check`.
- Load the extension unpacked in Chrome.
- Visit `https://github.com/settings/applications`.
- Visit `https://github.com/settings/apps/authorizations`.
- Confirm OAuth app permissions render inline.
- Confirm GitHub App permissions render inline.
- Confirm dangerous permissions show the red warning style.
- Confirm the popup toggle disables and re-enables the inline list.

## Package

- Run `npm run package`.
- Upload the ZIP from `dist/`.
- Do not upload the repository folder directly.

## Screenshots to capture

- Chrome Web Store requires at least one screenshot.
- Capture 1280 x 800 PNG screenshots when possible.
- Redact private organization names, app IDs, account names, and email addresses.
- Put final screenshots in `docs/screenshots/` before store upload.

## Store review notes

Suggested reviewer note:

> This extension runs only on GitHub settings pages. It fetches same-site GitHub app detail pages that the signed-in user can already view, extracts the visible permission text, and renders it inline on the GitHub app list. It does not modify GitHub data or contact external services.
