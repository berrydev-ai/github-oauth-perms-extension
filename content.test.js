const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const {
  APPLICATIONS_PATH,
  DEFAULT_ENABLED,
  DANGEROUS_PERMISSION_ITEM_CLASS,
  FEATURE_ENABLED_KEY,
  INSTALL_SUMMARY_ITEM_CLASS,
  PERMISSION_ITEM_CLASS,
  extractInstalledAccountNamesFromMarkup,
  extractInstallSummaryFromMarkup,
  extractPermissionTextsFromMarkup,
  isApplicationsPath,
  isDangerousPermission,
} = require("./content");

test("content script runs on the supported applications paths", () => {
  assert.equal(APPLICATIONS_PATH, "/settings/applications");
  assert.equal(isApplicationsPath("/settings/applications"), true);
  assert.equal(isApplicationsPath("/settings/apps/authorizations"), true);
  assert.equal(isApplicationsPath("/settings/profile"), false);
});

test("manifest loads the script across settings pages for Turbo navigation", () => {
  const manifest = require("./manifest.json");

  assert.deepEqual(manifest.content_scripts[0].matches, ["https://github.com/settings/*"]);
});

test("manifest declares popup and storage permission for the feature toggle", () => {
  const manifest = require("./manifest.json");

  assert.deepEqual(manifest.permissions, ["storage"]);
  assert.deepEqual(manifest.host_permissions, ["https://github.com/*"]);
  assert.equal(manifest.action.default_popup, "popup.html");
  assert.equal(manifest.action.default_title, "GitHub Authorized Apps Permissions");
  assert.equal(manifest.short_name, "GitHub App Perms");
  assert.equal(manifest.icons["128"], "assets/icon-128.png");
  assert.equal(manifest.action.default_icon["16"], "assets/icon-16.png");
});

test("manifest icon files exist", () => {
  const manifest = require("./manifest.json");
  const iconPaths = new Set([
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon),
  ]);

  for (const iconPath of iconPaths) {
    assert.equal(fs.existsSync(iconPath), true, `${iconPath} should exist`);
  }
});

test("feature toggle defaults to enabled", () => {
  assert.equal(FEATURE_ENABLED_KEY, "ghpermEnabled");
  assert.equal(DEFAULT_ENABLED, true);
});

test("permission rows use GitHub's no-border utility", () => {
  assert.equal(PERMISSION_ITEM_CLASS, "p-0 listgroup-item border-0 wb-break-word ws-normal");
  assert.equal(DANGEROUS_PERMISSION_ITEM_CLASS, "p-0 listgroup-item border-0 wb-break-word ws-normal color-fg-danger text-bold");
  assert.equal(INSTALL_SUMMARY_ITEM_CLASS, "p-0 mt-2 text-small color-fg-muted wb-break-word ws-normal");
});

test("detects dangerous permission labels", () => {
  assert.equal(isDangerousPermission("Full control of private repositories"), true);
  assert.equal(isDangerousPermission("Update github action workflows"), true);
  assert.equal(isDangerousPermission("Read org and team membership, read org projects"), true);
  assert.equal(isDangerousPermission("Delete repositories"), true);
  assert.equal(isDangerousPermission("Act on your behalf"), true);
  assert.equal(isDangerousPermission("View and manage your starred repositories"), true);
  assert.equal(isDangerousPermission("Access user email addresses (read-only)"), false);
  assert.equal(isDangerousPermission("Read all user profile data"), false);
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

test("extracts Authorized GitHub App permission bullets from the detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <p><strong>Arcade.dev</strong> can access your account <strong>coderberry</strong> to:</p>
    <ul>
      <li>Verify your GitHub identity</li>
      <li>Know what resources you can access</li>
      <li>Act on your behalf</li>
      <li>View your email addresses</li>
      <li>View and manage your starred repositories</li>
      <li>View and manage your watched repositories</li>
    </ul>
    <p>Arcade.dev has not been installed on any accounts you have access to.</p>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "Verify your GitHub identity",
    "Know what resources you can access",
    "Act on your behalf",
    "View your email addresses",
    "View and manage your starred repositories",
    "View and manage your watched repositories",
  ]);
});

test("extracts Authorized GitHub App install summary from the detail page", () => {
  const html = `
    <h2>Permissions</h2>
    <p><strong>ChatGPT Codex Connector</strong> can access your account <strong>coderberry</strong> to:</p>
    <ul>
      <li>Verify your GitHub identity</li>
      <li>Act on your behalf</li>
      <li>View your email addresses</li>
    </ul>
    <p>ChatGPT Codex Connector has been installed on 9 accounts you have access to: <strong>abuiles</strong>, <strong>bercastle</strong>, <strong>berrydev-ai</strong>, <strong>giraffemedia</strong>, <strong>knomedia</strong>, and more.</p>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.equal(
    extractInstallSummaryFromMarkup(html),
    "Installed to: abuiles, bercastle, berrydev-ai, giraffemedia, knomedia, and more.",
  );
  assert.deepEqual(extractInstalledAccountNamesFromMarkup(html), [
    "abuiles",
    "bercastle",
    "berrydev-ai",
    "giraffemedia",
    "knomedia",
  ]);
});

test("does not combine checked GitHub App permissions with the account access list", () => {
  const html = `
    <h2>Permissions</h2>
    <div>
      <svg class="octicon octicon-check color-fg-success" aria-hidden="true"></svg>
      This application will receive your GitHub ID, your GitHub Copilot Chat session messages, and metadata from GitHub.
    </div>
    <p><strong>Metis Dev Assistant Integration</strong> can access your account <strong>coderberry</strong> to:</p>
    <ul>
      <li>Verify your GitHub identity</li>
      <li>Know what resources you can access</li>
      <li>Act on your behalf</li>
    </ul>
    <p>Metis Dev Assistant Integration has not been installed on any accounts you have access to.</p>
    <p>Applications act on your behalf to access your data.</p>
  `;

  assert.deepEqual(extractPermissionTextsFromMarkup(html), [
    "This application will receive your GitHub ID, your GitHub Copilot Chat session messages, and metadata from GitHub.",
  ]);
});
