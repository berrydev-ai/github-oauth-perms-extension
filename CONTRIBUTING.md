# Contributing

Thanks for helping improve GitHub Authorized Apps - Inline Permissions.

## Development setup

1. Clone the repository.
2. Run `npm test`.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked** and select this repository folder.

## Before opening a pull request

- Keep changes focused on one issue.
- Add or update tests in `content.test.js` when parser or manifest behavior changes.
- Run `npm test`.
- Run `npm run check`.
- Do not include screenshots that expose private GitHub organizations, app IDs, tokens, or email addresses.

## Parser changes

GitHub changes its settings-page markup over time. When fixing parser behavior:

- Add a small HTML fixture directly in a test.
- Keep the fixture limited to the markup needed for the bug.
- Avoid adding real cookies, tokens, or private account data.

## Release changes

For release packaging, run:

```sh
npm run package
```

The generated ZIP in `dist/` is the browser-store upload package.
