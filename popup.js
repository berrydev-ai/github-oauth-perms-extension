const FEATURE_ENABLED_KEY = "ghpermEnabled";
const DEFAULT_ENABLED = true;

const checkbox = document.getElementById("enabled");

chrome.storage.sync.get({ [FEATURE_ENABLED_KEY]: DEFAULT_ENABLED }, (items) => {
  checkbox.checked = items[FEATURE_ENABLED_KEY] !== false;
});

checkbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [FEATURE_ENABLED_KEY]: checkbox.checked });
});
