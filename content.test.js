const assert = require("node:assert/strict");
const test = require("node:test");

const {
  APPLICATIONS_PATH,
  DEFAULT_ENABLED,
  FEATURE_ENABLED_KEY,
  PERMISSION_ITEM_CLASS,
  extractPermissionTextsFromMarkup,
  isApplicationsPath,
} = require("./content");

test("content script runs only on the OAuth applications path", () => {
  assert.equal(APPLICATIONS_PATH, "/settings/applications");
  assert.equal(isApplicationsPath("/settings/applications"), true);
  assert.equal(isApplicationsPath("/settings/profile"), false);
});

test("manifest loads the script across settings pages for Turbo navigation", () => {
  const manifest = require("./manifest.json");

  assert.deepEqual(manifest.content_scripts[0].matches, ["https://github.com/settings/*"]);
});

test("manifest declares popup and storage permission for the feature toggle", () => {
  const manifest = require("./manifest.json");

  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.equal(manifest.action.default_popup, "popup.html");
});

test("feature toggle defaults to enabled", () => {
  assert.equal(FEATURE_ENABLED_KEY, "ghpermEnabled");
  assert.equal(DEFAULT_ENABLED, true);
});

test("permission rows use GitHub's no-border utility", () => {
  assert.equal(PERMISSION_ITEM_CLASS, "p-0 listgroup-item border-0");
});

test("extracts the exact Heroku permission text from the OAuth detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Full control of private repositories
    </div>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Full control of private repositories",
  ]);
});

test("extracts each exact Hoppscotch permission text from the OAuth detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Create gists
    </div>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Access user email addresses (read-only)
    </div>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Create gists",
    "Access user email addresses (read-only)",
  ]);
});

test("extracts the exact email-only permission text from the OAuth detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Access user email addresses (read-only)
    </div>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Access user email addresses (read-only)",
  ]);
});

test("extracts each exact JetBrains permission text from the OAuth detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Read all user profile data
    </div>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      Access user email addresses (read-only)
    </div>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Read all user profile data",
    "Access user email addresses (read-only)",
  ]);
});

test("does not stop before permission rows when GitHub inserts a dialog heading", () => {
  const html = `
    <h2 data-view-component="true" class="Subhead-heading Subhead-heading--large">Permissions</h2>
    <details-dialog>
      <h3>Are you sure you want to revoke access?</h3>
    </details-dialog>
    <div>
      <div class="pl-0 listgroup-item">
        <svg data-component="Octicon" class="octicon octicon-check color-fg-success mr-1" aria-hidden="true"></svg>
        Read all user profile data
      </div>
      <div class="pl-0 listgroup-item">
        <svg data-component="Octicon" class="octicon octicon-check color-fg-success mr-1" aria-hidden="true"></svg>
        Access user email addresses (read-only)
      </div>
    </div>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Read all user profile data",
    "Access user email addresses (read-only)",
  ]);
});
