function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function text(selector, root = document) {
  const el = root.querySelector(selector);
  return el ? cleanText(el.textContent) : "";
}

function canonicalUrl() {
  const link = document.querySelector('link[rel="canonical"]');
  const url = link && link.href ? link.href : window.location.href;
  return url.split("?")[0].replace(/\/$/, "");
}

function pageTitleName() {
  const title = cleanText(document.title);
  if (!title) return "";
  return title
    .replace(/\s+\|\s+LinkedIn.*$/i, "")
    .replace(/\s+-\s+Sales Navigator.*$/i, "")
    .replace(/\s+\|\s+Sales Navigator.*$/i, "")
    .trim();
}

function visibleLines(root = document.body) {
  return (root.innerText || "")
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean);
}

function fullPageText() {
  return cleanText(document.body ? document.body.innerText : "");
}

function firstMatchingLine(patterns, lines) {
  return lines.find((line) => patterns.some((pattern) => pattern.test(line))) || "";
}

function nearestProfileSection() {
  const heading = document.querySelector("main h1, h1, [data-anonymize='person-name']");
  if (!heading) return document.querySelector("main") || document.body;
  return heading.closest("section") || heading.closest("main") || document.querySelector("main") || document.body;
}

function profileName() {
  const name = (
    text("main h1") ||
    text("h1") ||
    text('[data-anonymize="person-name"]') ||
    pageTitleName()
  );
  return cleanText(name.replace(/\s+·\s+(1st|2nd|3rd|3rd\+).*$/i, ""));
}

function isSectionDump(value) {
  const candidate = cleanText(value);
  if (!candidate) return true;
  if (candidate.length > 180) return true;
  return /\b(Activity|Experience|Education|Licenses & certifications|Volunteering|Interests|More profiles|People you may know|About Accessibility)\b/i.test(candidate);
}

function stripRelationshipPrefix(value) {
  return cleanText(value)
    .replace(/^·\s*/, "")
    .replace(/^(1st|2nd|3rd|3rd\+|2nd\+|1st\+)\s+/i, "")
    .replace(/^•\s*/, "");
}

function parseTopSummary(name) {
  const lines = visibleLines(document.body);
  const summary = { headlineRaw: "", location: "" };
  const exactNameIndex = lines.findIndex((line) => line === name || line.startsWith(`${name} ·`));

  if (exactNameIndex >= 0) {
    const sameLine = lines[exactNameIndex];
    if (sameLine.startsWith(`${name} ·`)) {
      const parsed = parseSummaryText(sameLine, name);
      if (parsed.headlineRaw || parsed.location) return parsed;
    }

    const nearby = lines.slice(exactNameIndex + 1, exactNameIndex + 7);
    const headline = nearby
      .map(stripRelationshipPrefix)
      .find((line) => line.length > 8 && !isSectionDump(line) && !/^(Contact info|Message|Follow|More)$/i.test(line));
    const location = nearby.find((line) => /Singapore/i.test(line) && line.length < 80) || "";
    summary.headlineRaw = headline || "";
    summary.location = location || "";
  }

  if (!summary.headlineRaw || !summary.location) {
    const parsed = parseSummaryText(fullPageText().slice(0, 800), name);
    summary.headlineRaw = summary.headlineRaw || parsed.headlineRaw;
    summary.location = summary.location || parsed.location;
  }

  return summary;
}

function parseSummaryText(textValue, name) {
  const summary = { headlineRaw: "", location: "" };
  const text = cleanText(textValue);
  if (!text || !name) return summary;

  const namePattern = escapeRegExp(name);
  const summaryRegex = new RegExp(`${namePattern}\\s*(?:·\\s*)?(?:(?:1st|2nd|3rd|3rd\\+|2nd\\+|1st\\+)\\s+)?(.+)\\s+(Singapore,\\s*Singapore|Singapore)\\s*·\\s*Contact info`, "i");
  const match = text.match(summaryRegex);
  if (match) {
    let rawHeadline = cleanText(match[1]);
    let rawLocation = cleanText(match[2]);
    if (/Singapore,$/i.test(rawHeadline) && /^Singapore$/i.test(rawLocation)) {
      rawHeadline = rawHeadline.replace(/\s+Singapore,$/i, "");
      rawLocation = "Singapore, Singapore";
    }
    summary.headlineRaw = cleanHeadline(rawHeadline);
    summary.location = rawLocation;
    return summary;
  }

  const looseRegex = new RegExp(`${namePattern}\\s*(?:·\\s*)?(?:(?:1st|2nd|3rd|3rd\\+|2nd\\+|1st\\+)\\s+)?(.+?)(?:\\s+Experience\\b|\\s+Activity\\b|\\s+Education\\b)`, "i");
  const loose = text.match(looseRegex);
  if (loose) {
    const beforeSections = loose[1].replace(/\b(Singapore,\s*Singapore|Singapore)\b.*$/i, "").trim();
    summary.headlineRaw = cleanHeadline(beforeSections);
    const location = loose[1].match(/\bSingapore,\s*Singapore\b|\bSingapore\b/i);
    summary.location = location ? cleanText(location[0]) : "";
  }
  return summary;
}

function cleanHeadline(value) {
  const headline = stripRelationshipPrefix(value)
    .replace(/\s+·\s*Contact info.*$/i, "")
    .replace(/\s+Contact info.*$/i, "");
  return isSectionDump(headline) ? "" : headline;
}

function splitRoleCompany(value) {
  const headline = cleanHeadline(value);
  if (!headline) return { role: "", company: "" };
  const match = headline.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (!match) return { role: headline, company: "" };
  return {
    role: cleanText(match[1]),
    company: cleanText(match[2].replace(/\s+·.*$/, ""))
  };
}

function splitEmployerBusiness(value) {
  const raw = cleanText(value).replace(/\s+·.*$/, "");
  if (!raw) return { currentEmployer: "", company: "", gymCompany: "" };

  const selfEmployedMatch = raw.match(/^(Self[-\s]?Employed|Self employed|Freelance|Independent|Founder|Co[-\s]?Founder|Business owner|Owner|Proprietor)\s*,\s*(.+)$/i);
  if (selfEmployedMatch) {
    const company = cleanText(selfEmployedMatch[2]);
    return {
      currentEmployer: "Self Employed",
      company,
      gymCompany: company
    };
  }

  return { currentEmployer: raw, company: "", gymCompany: raw };
}

function hasSelfEmploymentSignal(value) {
  return /\b(Self[-\s]?Employed|Founder|Co[-\s]?Founder|Business Owner|Business-owner|Owner|Proprietor)\b/i.test(cleanText(value));
}

function ownedBusinessAffiliation(company) {
  const cleaned = cleanText(company).replace(/\s+·.*$/, "");
  if (!cleaned || isExperienceNoise(cleaned)) return null;
  return { currentEmployer: "Self Employed", company: cleaned, gymCompany: cleaned };
}

function isExperienceNoise(value) {
  const line = cleanText(value);
  if (!line) return true;
  return /^(Experience|Show all|Company name|Full-time|Part-time|Internship|Freelance|Contract|Self-employed)$/i.test(line) ||
    /\b(Present|\d+\s*(yr|yrs|year|years|mo|mos|month|months)|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/i.test(line) ||
    /^(Singapore|Singapore,\s*Singapore|Remote|Hybrid|On-site)$/i.test(line);
}

function experienceLines() {
  const section = document.querySelector("#experience, [id*='experience']");
  if (section) return visibleLines(section);

  const lines = visibleLines(document.body);
  const start = lines.findIndex((line) => /^Experience$/i.test(line));
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && /^(Education|Licenses & certifications|Volunteering|Skills|Honors & awards|Interests)$/i.test(line));
  return lines.slice(start + 1, end > start ? end : start + 25);
}

function selfEmploymentAffiliationFromExperience() {
  const lines = experienceLines();
  if (!lines.length) return null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const inline = line.match(/\b(Self[-\s]?Employed|Founder|Co[-\s]?Founder|Business Owner|Business-owner|Owner|Proprietor)\b(?:\s+and\s+Founder)?\s*(?:,|at|@)\s*(.+)$/i);
    if (inline && inline[2]) {
      const affiliation = ownedBusinessAffiliation(inline[2]);
      if (affiliation) return affiliation;
    }

    if (!hasSelfEmploymentSignal(line)) continue;
    const company = lines
      .slice(index + 1, index + 5)
      .map((candidate) => cleanText(candidate).replace(/\s+·.*$/, ""))
      .find((candidate) => candidate && !hasSelfEmploymentSignal(candidate) && !isExperienceNoise(candidate) && candidate.length <= 90);
    if (company) return { currentEmployer: "Self Employed", company, gymCompany: company };
  }

  return null;
}

function experienceText() {
  const text = fullPageText();
  const match = text.match(/\bExperience\b(.+?)(?:\bEducation\b|\bLicenses & certifications\b|\bVolunteering\b|\bSkills\b|$)/i);
  return match ? cleanText(match[1]) : "";
}

function licensesText() {
  const text = fullPageText();
  const match = text.match(/\bLicenses & certifications\b(.+?)(?:\bVolunteering\b|\bHonors & awards\b|\bSkills\b|\bInterests\b|$)/i);
  return match ? cleanText(match[1]) : "";
}

function profileImageUrl(name, profileRoot = document) {
  const scopedImages = profileRoot && typeof profileRoot.querySelectorAll === "function"
    ? Array.from(profileRoot.querySelectorAll("img"))
    : [];
  const images = (scopedImages.length ? scopedImages : Array.from(document.querySelectorAll("img")))
    .filter((img) => {
      if (typeof img.closest === "function" && img.closest("header, nav, .global-nav, [role='navigation']")) return false;
      const rect = typeof img.getBoundingClientRect === "function" ? img.getBoundingClientRect() : null;
      const width = rect && rect.width ? rect.width : (img.width || img.naturalWidth || 0);
      const height = rect && rect.height ? rect.height : (img.height || img.naturalHeight || 0);
      return width >= 64 && height >= 64;
    });
  const named = images.find((img) => {
    const alt = cleanText(img.alt || img.getAttribute("aria-label") || "");
    const src = img.currentSrc || img.src || "";
    const normalizedAlt = alt.toLowerCase();
    const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean);
    return src && nameParts.length && nameParts.some((part) => part.length > 2 && normalizedAlt.includes(part));
  });
  const candidate = named || images.find((img) => {
    const src = img.currentSrc || img.src || "";
    return src && /profile|display|photo|media/i.test(src);
  });
  return candidate ? (candidate.currentSrc || candidate.src || "") : "";
}

function estimateYearsExperience() {
  const months = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };
  const text = experienceText();
  if (!text) return "";
  const dateMatches = [...text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/gi)];
  if (!dateMatches.length) return "";

  const now = new Date();
  const earliest = dateMatches
    .map((match) => new Date(Number(match[2]), months[match[1].toLowerCase()], 1))
    .filter((date) => !Number.isNaN(date.getTime()) && date <= now)
    .sort((a, b) => a - b)[0];
  if (!earliest) return "";

  const totalMonths = Math.max(0, (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()));
  if (totalMonths < 12) return "Less than 1 year";
  const years = Math.floor(totalMonths / 12);
  const remainder = totalMonths % 12;
  if (remainder >= 6) return `About ${years + 1} years`;
  return `About ${years} years`;
}

function extractFormerGyms(currentCompanyName) {
  const text = experienceText();
  if (!text) return [];
  const known = [
    "Fitness First Singapore",
    "Fitness First",
    "Anytime Fitness Singapore",
    "Anytime Fitness",
    "SAFRA National Service Association",
    "SAFRA",
    "PARKROYAL on Beach Road, Singapore",
    "PARKROYAL on Beach Road",
    "Freelance"
  ];
  const current = cleanText(currentCompanyName).toLowerCase();
  const found = [];
  for (const gym of known) {
    const normalized = gym.toLowerCase();
    const isCurrent = current && (normalized === current || current.includes(normalized) || normalized.includes(current));
    if (text.toLowerCase().includes(normalized) && !isCurrent && !found.some((item) => item.toLowerCase() === normalized)) {
      found.push(gym);
    }
  }
  for (const gym of extractFormerGymsFromExperienceLines(currentCompanyName)) {
    const normalized = gym.toLowerCase();
    if (!found.some((item) => item.toLowerCase() === normalized)) found.push(gym);
  }
  return preferSpecificNames(found);
}

function isRoleLikeLine(value) {
  return /\b(Personal Trainer|Fitness Trainer|Floor Trainer|Strength|Conditioning|Coach|Instructor|Founder|Co[-\s]?Founder|Manager|Internship|Intern|Consultant|Specialist|Director)\b/i.test(cleanText(value));
}

function normalizeCompanyCandidate(value) {
  const line = cleanText(value).replace(/\s+·.*$/, "");
  if (!line || line.length < 3 || line.length > 90) return "";
  if (isExperienceNoise(line) || hasSelfEmploymentSignal(line)) return "";

  const roleCompany = splitRoleCompany(line);
  if (roleCompany.company && isRoleLikeLine(roleCompany.role)) return cleanText(roleCompany.company);
  if (isRoleLikeLine(line)) return "";
  if (/^(Certified|Certification|Diploma|Nitec|Bachelor|Master|Degree)\b/i.test(line)) return "";
  return line;
}

function hasCompanyEvidence(candidate, previous, next) {
  if (/\b(Fitness|Gym|Studio|Active|Athletic|Performance|Strength|Soul|Pilates|Yoga|Wellness|Training|Barre|Boxing|CrossFit|F45|Anytime|Virgin Active|Fitness First)\b/i.test(candidate)) return true;
  if (/^(Full-time|Part-time|Self-employed|Freelance|Contract|Internship)\b/i.test(cleanText(next))) return true;
  if (/\b\d+\s*(yr|yrs|year|years|mo|mos|month|months)\b/i.test(cleanText(next))) return true;
  if (isRoleLikeLine(previous) || isRoleLikeLine(next)) return true;
  return false;
}

function extractFormerGymsFromExperienceLines(currentCompanyName) {
  const lines = experienceLines();
  if (!lines.length) return [];
  const current = cleanText(currentCompanyName).toLowerCase();
  const found = [];

  for (let index = 0; index < lines.length; index += 1) {
    const candidate = normalizeCompanyCandidate(lines[index]);
    if (!candidate) continue;
    const normalized = candidate.toLowerCase();
    const isCurrent = current && (normalized === current || current.includes(normalized) || normalized.includes(current));
    if (isCurrent) continue;
    if (!hasCompanyEvidence(candidate, lines[index - 1] || "", lines[index + 1] || "")) continue;
    if (!found.some((item) => item.toLowerCase() === normalized)) found.push(candidate);
  }

  return found;
}

function extractCertifications() {
  const text = licensesText();
  if (!text) return [];
  const certs = [];
  const known = [
    "Sports Massage Therapy",
    "Weightlifting Coach Level 1",
    "Nitec Certification, Fitness Training",
    "Diploma in Health Management & Promotion"
  ];
  for (const cert of known) {
    if (text.toLowerCase().includes(cert.toLowerCase())) certs.push(cert);
  }

  const compact = text
    .replace(/\bIssued\s+[A-Z][a-z]{2}\s+\d{4}\b/g, "|")
    .replace(/\bShow all \d+ licenses\b/gi, "|");
  for (const part of compact.split("|")) {
    const item = cleanText(part)
      .replace(/\b\d+\.(jpg|png|jpeg)\b/gi, "")
      .replace(/\b[A-Z0-9]{6,}\b/g, "");
    if (item && item.length >= 6 && item.length <= 90 && !certs.some((cert) => cert.toLowerCase() === item.toLowerCase())) {
      certs.push(item);
    }
  }
  return preferSpecificNames(certs).slice(0, 8);
}

function preferSpecificNames(items) {
  const cleaned = [...new Set(items.map(cleanText).filter(Boolean))];
  return cleaned.filter((item) => {
    const lower = item.toLowerCase();
    return !cleaned.some((other) => {
      const otherLower = other.toLowerCase();
      return otherLower !== lower && otherLower.includes(lower) && other.length > item.length;
    });
  });
}

function buildNotes(currentCompanyName) {
  const notes = [];
  const formerGyms = extractFormerGyms(currentCompanyName);
  const certifications = extractCertifications();
  if (formerGyms.length) notes.push(`Former gyms: ${formerGyms.join("; ")}`);
  if (certifications.length) notes.push(`Credentials/certifications: ${certifications.join("; ")}`);
  return notes.join("\n");
}

function profileHeadline(profileRoot, name, summary) {
  const direct = cleanHeadline(
    text(".text-body-medium.break-words", profileRoot) ||
    text('[data-anonymize="headline"]') ||
    text('[data-test-lead-header-subtitle]') ||
    text('[data-x--lead-result-subtitle]')
  );
  const summaryHeadline = cleanHeadline(summary.headlineRaw);
  const primary = summaryHeadline || direct;
  if (primary) return splitRoleCompany(primary).role || primary;

  const lines = visibleLines(profileRoot);
  const nameIndex = lines.findIndex((line) => line === name);
  if (nameIndex >= 0) {
    const candidate = lines.slice(nameIndex + 1).find((line) => {
      const cleaned = cleanHeadline(line);
      return cleaned.length > 8 && !/^(1st|2nd|3rd|connect|message|more|contact info)$/i.test(cleaned);
    });
    if (candidate) return splitRoleCompany(candidate).role || cleanHeadline(candidate);
  }
  const matching = firstMatchingLine([/trainer/i, /coach/i, /fitness/i, /strength/i, /conditioning/i, /pilates/i, /yoga/i], lines);
  return splitRoleCompany(matching).role || cleanHeadline(matching);
}

function profileLocation(profileRoot, summary) {
  const direct =
    text(".text-body-small.inline.t-black--light.break-words", profileRoot) ||
    text('[data-anonymize="location"]');
  if (direct && !isSectionDump(direct)) return direct;
  if (summary.location) return summary.location;
  const lines = visibleLines(profileRoot);
  const location = firstMatchingLine([/Singapore,\s*Singapore/i, /\bSingapore\b/i, /\bsg\b/i], lines);
  return location.length < 90 ? location : "";
}

function currentAffiliation(summary, headline) {
  const headlineText = cleanText(`${summary.headlineRaw || ""} ${headline || ""}`);
  const headlineParts = splitRoleCompany(summary.headlineRaw || headline);
  const headlineCompany = headlineParts.company;
  if (headlineCompany && hasSelfEmploymentSignal(headlineParts.role || headlineText)) {
    const affiliation = ownedBusinessAffiliation(headlineCompany);
    if (affiliation) return affiliation;
  }
  if (headlineCompany) return splitEmployerBusiness(headlineCompany);

  const direct =
    text('[aria-label*="Current company"]') ||
    text('[data-anonymize="company-name"]') ||
    text('[data-test-current-company-name]');
  const selfEmployment = selfEmploymentAffiliationFromExperience();
  if (hasSelfEmploymentSignal(headlineText)) {
    if (selfEmployment) return selfEmployment;
    if (direct && !isSectionDump(direct)) {
      const company = cleanText(direct);
      return { currentEmployer: "Self Employed", company, gymCompany: company };
    }
  }

  if (selfEmployment) return selfEmployment;
  if (direct && !isSectionDump(direct)) return splitEmployerBusiness(direct);

  const useful = experienceLines().filter((line) => line.length < 90 && !isExperienceNoise(line));
  if (useful.length) return splitEmployerBusiness(useful[0]);
  return { currentEmployer: "", company: "", gymCompany: "" };
}

function externalWebsite() {
  const blockedHosts = [
    "linkedin.com",
    "licdn.com",
    "microsoft.com",
    "google.com",
    "apple.com"
  ];
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const candidates = anchors
    .map((anchor) => anchor.href)
    .filter((href) => /^https?:\/\//i.test(href))
    .filter((href) => !blockedHosts.some((host) => new URL(href).hostname.includes(host)))
    .filter((href) => !/\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i.test(new URL(href).pathname));
  return candidates[0] || "";
}

function confidence(profile) {
  let score = 0;
  if (profile.full_name) score += 35;
  if (profile.linkedin_url) score += 25;
  if (profile.headline) score += 15;
  if (profile.location) score += 10;
  if (profile.gym_company) score += 10;
  if (profile.website_url) score += 5;
  return Math.min(score, 100);
}

function captureProfile() {
  const root = nearestProfileSection();
  const name = profileName();
  const summary = parseTopSummary(name);
  const title = profileHeadline(root, name, summary);
  const headline = cleanHeadline(summary.headlineRaw) || title;
  const affiliation = currentAffiliation(summary, title);
  const profile = {
    full_name: name,
    linkedin_url: canonicalUrl(),
    profile_image_url: profileImageUrl(name, root),
    title,
    years_experience: estimateYearsExperience(),
    headline,
    current_employer: affiliation.currentEmployer,
    company: affiliation.company,
    gym_company: affiliation.gymCompany,
    location: profileLocation(root, summary),
    website_url: externalWebsite(),
    notes: buildNotes(affiliation.gymCompany),
    source: "chrome_extension"
  };
  profile.capture_confidence = confidence(profile);
  profile.capture_reason = [
    profile.full_name ? "name" : "",
    profile.linkedin_url ? "linkedin_url" : "",
    profile.profile_image_url ? "profile_image" : "",
    profile.headline ? "headline" : "",
    profile.title ? "title" : "",
    profile.years_experience ? "experience" : "",
    profile.location ? "location" : "",
    profile.current_employer ? "current_employer" : "",
    profile.company ? "company" : "",
    profile.gym_company ? "gym_company" : "",
    profile.notes ? "notes" : "",
    profile.website_url ? "website" : ""
  ].filter(Boolean).join(", ");
  return profile;
}

function addedStorageKey(url = canonicalUrl()) {
  return `trainersource_added:${url}`;
}

function showAddedMarker(details = {}) {
  const existing = document.getElementById("trainersource-added-marker");
  if (existing) existing.remove();

  const marker = document.createElement("div");
  marker.id = "trainersource-added-marker";
  marker.innerHTML = `
    <strong>Added to FlowChamp</strong>
    <span>${cleanText(details.full_name || "") || "Lead saved"}${details.lead_id ? ` · ${cleanText(details.lead_id)}` : ""}</span>
  `;
  marker.style.cssText = [
    "position: fixed",
    "top: 88px",
    "right: 20px",
    "z-index: 2147483647",
    "max-width: 320px",
    "border: 1px solid #9bd5c1",
    "border-radius: 8px",
    "box-shadow: 0 14px 34px rgba(23,32,27,.16)",
    "background: #e4f7ef",
    "color: #0f3f32",
    "font-family: Arial, sans-serif",
    "padding: 10px 12px",
    "line-height: 1.3"
  ].join(";");
  marker.querySelector("strong").style.cssText = "display:block;font-size:13px;font-weight:800;";
  marker.querySelector("span").style.cssText = "display:block;margin-top:2px;font-size:12px;";
  document.documentElement.appendChild(marker);
}

async function rememberAdded(details = {}) {
  const payload = {
    lead_id: details.lead_id || "",
    full_name: details.full_name || "",
    added_at: new Date().toISOString()
  };
  await chrome.storage.local.set({ [addedStorageKey()]: payload });
  showAddedMarker(payload);
}

async function restoreAddedMarker() {
  const stored = await chrome.storage.local.get(addedStorageKey());
  const details = stored[addedStorageKey()];
  if (details) showAddedMarker(details);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "TRAINERSOURCE_CAPTURE") {
    sendResponse(captureProfile());
  }
  if (message && message.type === "TRAINERSOURCE_MARK_ADDED") {
    rememberAdded(message.details || {}).then(() => sendResponse({ ok: true }));
    return true;
  }
});

restoreAddedMarker();
