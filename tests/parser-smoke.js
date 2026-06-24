const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const scrapedText = `Tavis Ho Zhin Hui · 3rd Advanced Personal Trainer at Fitness First Singapore Singapore, Singapore · Contact info Fitness First Singapore Republic Polytechnic 196 connections Message Follow More Activity 199 followers Follow Posts Comments Tavis Ho Zhin Hui reposted this Shawn Lee • 3rd+ Fitness Manager at Fitness First AMK 8mo • I’m #hiring. Know anyone who might be interested? 👋😊 6 reactions 6 2 comments 2 comments • 1 repost 1 repost Like Comment Repost Send Show all posts Experience Fitness First Singapore Full-time · 1 yr 2 mos AMK Hub · On-site Advanced Personal Trainer May 2026 - Present · 2 mos Fitness Instructor/Personal Trainer May 2025 - May 2026 · 1 yr 1 mo PARKROYAL on Beach Road, Singapore 11 mos Personal Trainer / Strength & Conditioning Coach Freelance Feb 2023 - Jul 2023 · 6 mos Fitness Trainer / Personal Trainer Internship Sep 2022 - Feb 2023 · 6 mos Fitness Trainer SAFRA National Service Association · Part-time Dec 2021 - Jul 2023 · 1 yr 8 mos Singapore Anytime Fitness Singapore 8 mos Floor Trainer Part-time Nov 2019 - Feb 2020 · 4 mos Floor Trainer Internship Jul 2019 - Nov 2019 · 5 mos Singapore Education Republic Polytechnic Diploma in Health Management & Promotion, Fitness, Sports and health Science Jan 2020 – May 2023 Institute of Technical Education Nitec Certification, Fitness Training 2018 – 2020 Show all 3 educations Licenses & certifications Sports Massage Therapy Edufit Asia Issued Oct 2025 1000065532.jpg Weightlifting Coach Level 1 Singapore Weightlifting Federation Issued Sep 2025 Show all 8 licenses Volunteering Cadet Inspector`;
const selfEmployedText = `Rina Chua · 3rd Personal Trainer at Self Employed, Urban Active Fitness Singapore, Singapore · Contact info Experience Self Employed, Urban Active Fitness Full-time · 5 yrs Singapore Personal Trainer Jan 2021 - Present · 5 yrs Education National Academy of Sports Medicine Certified Personal Trainer Licenses & certifications NASM Certified Personal Trainer Issued Jan 2021`;
const founderText = `Sharon XJ · 3rd Self-Employed and Founder Singapore, Singapore · Contact info
Experience
Self-Employed and Founder
Strength & Soul
Self-employed · 4 yrs
Singapore
Founder
Jan 2022 - Present · 4 yrs
Education
National University of Singapore
Licenses & certifications
Certified Personal Trainer Issued Jan 2022`;
const coFounderText = `Sabrina Jay · 3rd Co-Founder at Sabrina Jay Fitness Singapore, Singapore · Contact info
Experience
Co-Founder
Sabrina Jay Fitness
Self-employed · 3 yrs
Singapore
Jan 2023 - Present · 3 yrs
Education
Certified Personal Trainer`;
const genericFormerGymText = `Maya Tan · 3rd Personal Trainer at Current Performance Studio Singapore, Singapore · Contact info
Experience
Current Performance Studio
Full-time · 2 yrs
Singapore
Personal Trainer
Jan 2024 - Present · 2 yrs
River Valley Fitness Lab
Part-time · 1 yr
Fitness Coach
Jan 2022 - Jan 2023 · 1 yr
Education
Certified Personal Trainer`;

const code = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");

function captureFromText({ name, text, url }) {
  const sandbox = {
    chrome: {
      runtime: { onMessage: { addListener() {} } },
      storage: { local: { get: async () => ({}) } }
    },
    document: {
      title: `${name} | LinkedIn`,
      body: {
        innerText: text,
        querySelector() { return null; }
      },
      querySelector(selector) {
        if (selector.includes("h1")) {
          return {
            textContent: name,
            closest() { return sandbox.document.body; }
          };
        }
        return null;
      },
      querySelectorAll() {
        return [
          { alt: "Tim Schultz", src: "https://media.licdn.com/profile-displayphoto-tim.jpg", currentSrc: "https://media.licdn.com/profile-displayphoto-tim.jpg", width: 24, height: 24, naturalWidth: 200, naturalHeight: 200 },
          { alt: name, src: "https://media.licdn.com/profile-displayphoto-test.jpg", currentSrc: "https://media.licdn.com/profile-displayphoto-test.jpg", width: 156, height: 156, naturalWidth: 200, naturalHeight: 200 }
        ];
      },
      documentElement: { appendChild() {} },
      createElement() {
        return { style: {}, querySelector() { return { style: {} }; }, remove() {} };
      }
    },
    window: { location: { href: url } },
    URL,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return vm.runInContext("captureProfile()", sandbox);
}

const profile = captureFromText({
  name: "Tavis Ho Zhin Hui",
  text: scrapedText,
  url: "https://www.linkedin.com/in/tavis-ho-zhin-hui/"
});
assert.equal(profile.full_name, "Tavis Ho Zhin Hui");
assert.equal(profile.title, "Advanced Personal Trainer");
assert.equal(profile.headline, "Advanced Personal Trainer at Fitness First Singapore");
assert.equal(profile.current_employer, "Fitness First Singapore");
assert.equal(profile.company, "");
assert.equal(profile.gym_company, "Fitness First Singapore");
assert.equal(profile.location, "Singapore, Singapore");
assert(profile.years_experience, "years of experience should be estimated from visible experience dates");
assert(profile.profile_image_url.includes("profile-displayphoto"), "profile image should be captured");
assert(profile.notes.includes("Anytime Fitness"), "former gyms should be listed in notes");
assert(profile.notes.includes("Sports Massage Therapy"), "certifications should be listed in notes");
assert(profile.notes.includes("Weightlifting Coach Level 1"), "certifications should include weightlifting");
assert(!profile.headline.includes("Experience"), "headline should not include the whole page dump");

const selfEmployedProfile = captureFromText({
  name: "Rina Chua",
  text: selfEmployedText,
  url: "https://www.linkedin.com/in/rina-chua/"
});
assert.equal(selfEmployedProfile.title, "Personal Trainer");
assert.equal(selfEmployedProfile.headline, "Personal Trainer at Self Employed, Urban Active Fitness");
assert.equal(selfEmployedProfile.current_employer, "Self Employed");
assert.equal(selfEmployedProfile.company, "Urban Active Fitness");
assert.equal(selfEmployedProfile.gym_company, "Urban Active Fitness");

const founderProfile = captureFromText({
  name: "Sharon XJ",
  text: founderText,
  url: "https://www.linkedin.com/in/sharonxj/"
});
assert.equal(founderProfile.title, "Self-Employed and Founder");
assert.equal(founderProfile.current_employer, "Self Employed");
assert.equal(founderProfile.company, "Strength & Soul");
assert.equal(founderProfile.gym_company, "Strength & Soul");

const coFounderProfile = captureFromText({
  name: "Sabrina Jay",
  text: coFounderText,
  url: "https://www.linkedin.com/in/sabrinajay/"
});
assert.equal(coFounderProfile.title, "Co-Founder");
assert.equal(coFounderProfile.headline, "Co-Founder at Sabrina Jay Fitness");
assert.equal(coFounderProfile.current_employer, "Self Employed");
assert.equal(coFounderProfile.company, "Sabrina Jay Fitness");
assert.equal(coFounderProfile.gym_company, "Sabrina Jay Fitness");

const genericFormerGymProfile = captureFromText({
  name: "Maya Tan",
  text: genericFormerGymText,
  url: "https://www.linkedin.com/in/maya-tan/"
});
assert.equal(genericFormerGymProfile.current_employer, "Current Performance Studio");
assert.equal(genericFormerGymProfile.company, "");
assert(genericFormerGymProfile.notes.includes("River Valley Fitness Lab"), "generic former gyms should be listed in notes");
console.log(JSON.stringify(profile, null, 2));
console.log(JSON.stringify(selfEmployedProfile, null, 2));
console.log(JSON.stringify(founderProfile, null, 2));
console.log(JSON.stringify(coFounderProfile, null, 2));
console.log(JSON.stringify(genericFormerGymProfile, null, 2));
