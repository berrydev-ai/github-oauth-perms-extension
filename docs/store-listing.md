# Store Listing Draft

## Product name

GitHub Authorized Apps - Inline Permissions

## Short name

GitHub App Perms

## Short description

Shows authorized GitHub app permissions inline on GitHub settings pages.

## Detailed description

GitHub Authorized Apps - Inline Permissions makes GitHub's application settings easier to audit.

GitHub normally shows many authorized app permissions only after you open each app detail page. This extension fetches those same GitHub detail pages using your current signed-in session and displays the permission text directly on the app list.

Key features:

- Shows Authorized OAuth App permissions inline.
- Shows Authorized GitHub App permissions inline.
- Marks broad or risky permissions with a warning icon.
- Shows installed account summaries for GitHub Apps.
- Includes a toolbar popup toggle so you can turn the feature on or off without disabling the extension.

Privacy and safety:

- Read-only.
- No analytics.
- No external servers.
- No GitHub API calls.
- No permission changes, revokes, or writes.
- Only runs on GitHub settings pages.

## Category

Developer Tools

## Keywords

GitHub, OAuth, GitHub Apps, permissions, security, developer tools, audit

## Chrome Web Store fields

### Single purpose

Display authorized GitHub app and OAuth app permissions inline on GitHub settings pages so users can audit app access without opening each app individually.

### Permission justification: `storage`

Stores the user's on/off preference for showing inline permissions.

### Host permission justification: `https://github.com/*`

Runs on GitHub settings pages and fetches same-site GitHub app detail pages that the signed-in user can already view. These detail pages contain the permission text shown inline by the extension.

### Remote code

No remote code is used.

### Data use disclosure

The extension does not collect, sell, share, or transmit user data. It reads GitHub settings-page permission text in the browser and renders it inline.

### Privacy policy URL

Use the repository `PRIVACY.md` URL after publishing the repository:

`https://github.com/berrydev-ai/github-oauth-perms-extension/blob/main/PRIVACY.md`

## Required assets

### Chrome Web Store

- Extension icon: `assets/icon-128.png`
- Small promotional tile: `store-assets/promo-small-440x280.png`
- Marquee promotional tile: `store-assets/promo-marquee-1400x560.png`, optional
- Screenshot: at least 1, up to 5 total, 1280 x 800 preferred
- YouTube promo video: optional

### Microsoft Edge Add-ons

- Extension logo: `store-assets/icon-300.png`
- Description: 250 to 10,000 characters
- Small promotional tile: `store-assets/promo-small-440x280.png`
- Large promotional tile: `store-assets/promo-marquee-1400x560.png`, optional
- Screenshots: up to 6, either 640 x 480 or 1280 x 800
- YouTube video URL: optional

## References

- Chrome listing fields: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Chrome image requirements: https://developer.chrome.com/docs/webstore/images
- Chrome privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Microsoft Edge publishing: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension

## Screenshot plan

1. OAuth app list with inline permissions visible.
2. GitHub App list with dangerous permissions highlighted.
3. Popup toggle open.
4. Before/after view if you want a marketing comparison.

## Screenshot privacy checklist

- Use a test GitHub account if possible.
- Redact account names, organization names, app IDs, private app names, and email addresses.
- Avoid screenshots that include cookies, browser devtools, or the address bar with private query strings.
