const DEFAULT_BACKEND_URL = "http://72.61.123.54:8018";
const SETTINGS_KEYS = ["backendUrl", "apiToken", "capturedBy"];
const LEAD_FIELDS = ["full_name", "linkedin_url", "profile_image_url", "title", "years_experience", "headline", "current_employer", "company", "location", "website_url", "notes"];
const DRAFT_PREFIX = "trainersource_draft:";

function el(id) {
  return document.getElementById(id);
}

function setState(kind, title, message) {
  el("statusPanel").className = `panel ${kind}`;
  el("statusIcon").textContent = kind === "success" ? "Ready" : kind === "error" ? "Check" : "...";
  el("statusTitle").textContent = title;
  el("status").textContent = message;
}

async function setBadge(text, color = "#123c35") {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  } catch (error) {
    // Badge updates are nice-to-have.
  }
}

function normalizeUrl(value) {
  return (value || DEFAULT_BACKEND_URL).trim().replace(/\/$/, "");
}

async function loadSettings() {
  const saved = await chrome.storage.sync.get(SETTINGS_KEYS);
  const settings = {
    backendUrl: normalizeUrl(saved.backendUrl),
    apiToken: saved.apiToken || "",
    capturedBy: saved.capturedBy || ""
  };
  el("backendUrl").value = settings.backendUrl;
  el("apiToken").value = settings.apiToken;
  el("capturedBy").value = settings.capturedBy;
  return settings;
}

async function saveSettings() {
  const settings = {
    backendUrl: normalizeUrl(el("backendUrl").value),
    apiToken: el("apiToken").value.trim(),
    capturedBy: el("capturedBy").value.trim()
  };
  await chrome.storage.sync.set(settings);
  return settings;
}

function showSettings(show = true) {
  el("settingsPanel").classList.toggle("hidden", !show);
}

function fillLeadFields(profile) {
  for (const field of LEAD_FIELDS) {
    if (el(field)) el(field).value = profile[field] || "";
  }
  updateProfilePreview(profile);
}

function updateProfilePreview(profile = {}) {
  const panel = el("profilePreviewPanel");
  const image = el("profilePreviewImage");
  const imageUrl = (profile.profile_image_url || "").trim();
  panel.classList.toggle("hidden", !imageUrl && !profile.full_name);
  panel.classList.toggle("no-image", !imageUrl);
  image.classList.toggle("hidden", !imageUrl);
  if (imageUrl) {
    image.src = imageUrl;
  } else {
    image.removeAttribute("src");
  }
  el("profilePreviewName").textContent = profile.full_name || "Captured profile";
  el("profilePreviewMeta").textContent = profile.title || profile.company || profile.current_employer || profile.location || "Ready for review";
}

function currentPayload(settings) {
  const employer = el("current_employer").value.trim();
  const company = el("company").value.trim();
  return {
    full_name: el("full_name").value.trim(),
    linkedin_url: el("linkedin_url").value.trim(),
    profile_image_url: el("profile_image_url").value.trim(),
    title: el("title").value.trim(),
    years_experience: el("years_experience").value.trim(),
    headline: el("headline").value.trim(),
    current_employer: employer,
    company,
    gym_company: company || employer,
    location: el("location").value.trim(),
    website_url: el("website_url").value.trim(),
    notes: el("notes").value.trim(),
    captured_by: settings.capturedBy || "chrome_extension",
    source: "chrome_extension"
  };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function canonicalDraftUrl(url = "") {
  return url.split("?")[0].replace(/\/$/, "");
}

function draftKey(url = "") {
  return `${DRAFT_PREFIX}${canonicalDraftUrl(url)}`;
}

function currentDraftProfile() {
  const profile = {};
  for (const field of LEAD_FIELDS) {
    if (el(field)) profile[field] = el(field).value || "";
  }
  return profile;
}

async function saveDraft() {
  const tab = await activeTab();
  const url = canonicalDraftUrl(el("linkedin_url").value || (tab && tab.url) || "");
  if (!isLinkedInProfile(url)) return;
  await chrome.storage.local.set({
    [draftKey(url)]: {
      ...currentDraftProfile(),
      saved_at: new Date().toISOString()
    }
  });
}

async function restoreDraft() {
  const tab = await activeTab();
  const url = canonicalDraftUrl((tab && tab.url) || "");
  if (!isLinkedInProfile(url)) return false;
  const stored = await chrome.storage.local.get(draftKey(url));
  const draft = stored[draftKey(url)];
  if (!draft) return false;
  fillLeadFields(draft);
  setState("success", "Draft restored", "Review the captured fields, then Enrich to send.");
  return true;
}

async function clearDraft() {
  const tab = await activeTab();
  const url = canonicalDraftUrl(el("linkedin_url").value || (tab && tab.url) || "");
  if (!isLinkedInProfile(url)) return;
  await chrome.storage.local.remove(draftKey(url));
}

function isLinkedInProfile(url = "") {
  return /https:\/\/www\.linkedin\.com\/(in|sales\/lead|sales\/people)\//i.test(url);
}

async function captureCurrentProfile() {
  const tab = await activeTab();
  if (!tab || !isLinkedInProfile(tab.url || "")) {
    throw new Error("Open a LinkedIn or Sales Navigator profile, then click the extension.");
  }
  try {
    const captured = await chrome.tabs.sendMessage(tab.id, { type: "TRAINERSOURCE_CAPTURE" });
    if (!captured.linkedin_url && tab.url) captured.linkedin_url = tab.url.split("?")[0];
    return captured;
  } catch (error) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    const captured = await chrome.tabs.sendMessage(tab.id, { type: "TRAINERSOURCE_CAPTURE" });
    if (!captured.linkedin_url && tab.url) captured.linkedin_url = tab.url.split("?")[0];
    return captured;
  }
}

async function captureIntoForm() {
  setState("working", "Capturing profile", "Reading the visible LinkedIn page.");
  el("capture").disabled = true;
  try {
    const profile = await captureCurrentProfile();
    fillLeadFields(profile);
    await saveDraft();
    const confidence = profile.capture_confidence || 0;
    const message = confidence >= 70
      ? "Review the captured fields, then send."
      : "Some fields may be missing. Review before sending.";
    setState("success", "Captured data ready", message);
  } catch (error) {
    setState("error", "Could not capture", error.message);
  } finally {
    el("capture").disabled = false;
  }
}

async function markActivePageAdded(lead) {
  const tab = await activeTab();
  if (!tab || !tab.id) return;
  const details = {
    lead_id: lead.lead_id,
    full_name: lead.full_name
  };
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TRAINERSOURCE_MARK_ADDED", details });
  } catch (error) {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.tabs.sendMessage(tab.id, { type: "TRAINERSOURCE_MARK_ADDED", details });
  }
}

async function enrichLead() {
  const settings = await saveSettings();
  if (!settings.apiToken) {
    showSettings(true);
    setState("error", "Setup needed", "Save the API token once before sending.");
    return;
  }
  const payload = currentPayload(settings);
  if (!payload.full_name) {
    setState("error", "Missing name", "Full name is required before sending.");
    return;
  }
  if (!payload.linkedin_url) {
    setState("error", "Missing URL", "LinkedIn URL is required before sending.");
    return;
  }

  el("enrich").disabled = true;
  setState("working", "Enriching lead", payload.full_name);
  try {
    const response = await fetch(`${settings.backendUrl}/intake/chrome`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.apiToken}`
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Backend rejected the capture.");
    await markActivePageAdded(result.lead);
    await clearDraft();
    await setBadge("ADDED", "#0f766e");
    setState("success", "Lead added", `${result.lead.full_name} is now in FlowChamp.`);
  } catch (error) {
    setState("error", "Enrich failed", error.message);
  } finally {
    el("enrich").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await loadSettings();
  if (!settings.apiToken) showSettings(true);
  const restored = await restoreDraft();
  if (!restored) setState("working", "Ready", "Tap Capture to fill the fields, then Enrich to send.");
  el("settingsToggle").addEventListener("click", () => showSettings(el("settingsPanel").classList.contains("hidden")));
  el("saveSettings").addEventListener("click", async () => {
    await saveSettings();
    showSettings(false);
    setState("success", "Setup saved", "Tap Capture to fill the fields.");
  });
  for (const field of LEAD_FIELDS) {
    if (el(field)) el(field).addEventListener("input", saveDraft);
  }
  el("capture").addEventListener("click", captureIntoForm);
  el("enrich").addEventListener("click", enrichLead);
});
