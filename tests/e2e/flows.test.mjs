// End-to-end verification of every core flow, driven in a real Chromium.
// Requires a seeded server: npm run setup && npm run build && npm start
// Run with: node tests/e2e/flows.test.mjs [baseUrl]
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] ?? "http://localhost:3100";
const EXECUTABLE =
  process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 420, height: 880 } });
page.setDefaultTimeout(15000);

const stamp = Date.now().toString().slice(-7);
const username = `e2e_${stamp}`;

console.log(`E2E against ${BASE}`);

await step("home feed renders videos for signed-out visitors", async () => {
  await page.goto(BASE + "/");
  await page.waitForSelector("video");
  const count = await page.locator("video").count();
  assert.ok(count >= 5, `expected >=5 videos in feed, got ${count}`);
});

await step("first video autoplays", async () => {
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return v && !v.paused && v.currentTime > 0;
  });
});

await step("rating while signed out redirects to sign-in", async () => {
  await page.click("text=Pop it");
  await page.waitForURL(/\/login/);
});

await step("sign up creates an account and starter channel", async () => {
  await page.goto(BASE + "/login");
  await page.fill('input[placeholder="like sunny_dan"]', username);
  await page.fill('input[placeholder="like Sunny Dan"]', "E2E Tester");
  await page.fill('input[type="password"]', "test1234");
  await page.click('button[type="submit"]');
  await page.waitForURL(BASE + "/");
  await page.waitForSelector("video");
});

await step("rate a video (Extra Butter)", async () => {
  await page.click("text=Pop it");
  await page.waitForSelector("text=Extra Butter");
  await page.click("text=Extra Butter");
  await page.waitForSelector('button:has-text("Rated")');
});

await step("save a video to the starter channel", async () => {
  await page.click('button:has-text("Save")');
  await page.waitForSelector("text=My Favorites");
  await page.click("text=My Favorites");
  await page.waitForSelector('button:has-text("Saved ✓")');
  await page.keyboard.press("Escape");
});

await step("post a timecoded comment", async () => {
  await page.click('button:has-text("Comment")');
  await page.fill("textarea", "E2E was here — great scene!");
  await page.waitForSelector("text=/at \\d+:\\d+/");
  await page.click('button:has-text("Post")');
  await page.waitForSelector("text=E2E was here — great scene!");
  await page.keyboard.press("Escape");
});

await step("detail sheet shows backstory and creator link", async () => {
  await page.click("text=Tap for the full story");
  await page.waitForSelector("text=See their creator page");
  await page.keyboard.press("Escape");
});

await step("channels page shows prebuilt lineup + my channels", async () => {
  await page.goto(BASE + "/channels");
  await page.waitForSelector("text=Surprise Me");
  await page.waitForSelector("text=My Favorites");
  await page.waitForSelector("text=The Laugh Track");
});

await step("create a channel from the channels page", async () => {
  await page.click("text=＋ New channel");
  await page.fill('input[placeholder^="Like"]', "E2E Test Channel");
  await page.click('button:has-text("Create channel")');
  await page.waitForURL(/\/channel\/e2e-test-channel/);
  await page.waitForSelector("text=E2E Test Channel");
});

await step("channel page: prebuilt channel plays all in context", async () => {
  await page.goto(BASE + "/channel/critter-corner");
  await page.waitForSelector("text=Critter Corner");
  await page.click("text=▶ Play all");
  await page.waitForURL(/\/watch\/.+\?ch=critter-corner/);
  await page.waitForSelector("video");
});

await step("weekly chart renders ranked videos", async () => {
  await page.goto(BASE + "/charts");
  await page.waitForSelector("text=Top this week");
  const cards = await page.locator("a[href^='/watch/']").count();
  assert.ok(cards >= 3, `expected >=3 chart entries, got ${cards}`);
});

await step("all-time chart renders", async () => {
  await page.goto(BASE + "/charts?t=alltime");
  await page.waitForSelector("text=All-time greats");
  const cards = await page.locator("a[href^='/watch/']").count();
  assert.ok(cards >= 3, `expected >=3 chart entries, got ${cards}`);
});

await step("surprise me feed loads", async () => {
  await page.goto(BASE + "/surprise");
  await page.waitForSelector("video");
});

await step("switch to Creating mode re-skins the tab bar", async () => {
  await page.goto(BASE + "/you");
  await page.click("text=Switch to Creating");
  await page.waitForURL(/\/studio/);
  await page.waitForSelector("nav >> text=Studio");
  await page.waitForSelector("nav >> text=Add video");
});

await step("upload a video with backstory and series", async () => {
  await page.goto(BASE + "/studio/upload");
  await page
    .locator('input[type="file"]')
    // .webm: this Chromium build lacks H.264, and the flow must play back.
    .setInputFiles(path.join(repoRoot, "media", "videos", "biscuit-heist.webm"));
  await page.waitForSelector("text=tap to change");
  await page.fill('input[placeholder="Give it a great name"]', "E2E Upload Test");
  await page.selectOption("select", "comedy");
  await page.fill("textarea", "Made by a robot, reviewed by humans.");
  await page.click('button:has-text("Put it on Reely")');
  await page.waitForURL(/\/watch\/.+/, { timeout: 30000 });
  await page.waitForSelector("text=E2E Upload Test");
});

await step("uploaded video plays back from /media", async () => {
  await page.waitForFunction(() => {
    const v = document.querySelector("video");
    return v && v.readyState >= 2;
  });
});

await step("studio lists the uploaded video", async () => {
  await page.goto(BASE + "/studio");
  await page.waitForSelector("text=E2E Upload Test");
});

await step("creator profile edit saves tools & story", async () => {
  await page.goto(BASE + "/studio/profile");
  await page.fill('textarea[placeholder^="Your story"]', "I am an end-to-end test.");
  await page.fill('input[placeholder^="iPhone 15"]', "Playwright, Chromium");
  await page.click('button:has-text("Save")');
  await page.waitForSelector("text=Saved! ✓");
});

await step("public creator page celebrates the creator", async () => {
  await page.goto(BASE + `/creator/${username}`);
  await page.waitForSelector("text=I am an end-to-end test.");
  await page.waitForSelector("text=Playwright");
  await page.waitForSelector("text=E2E Upload Test");
});

await step("seeded creator page shows series and process", async () => {
  await page.goto(BASE + "/creator/whodunit_wanda");
  await page.waitForSelector("text=The Lost Locket");
  await page.waitForSelector("text=How they make it");
});

await step("friends: invite the demo user", async () => {
  await page.goto(BASE + "/friends");
  await page.fill('input[placeholder="their username"]', "demo");
  await page.click('button:has-text("Invite")');
  await page.waitForSelector("text=Invite sent!");
});

await step("share link: /watch/<id> deep link works signed-out", async () => {
  const context2 = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const page2 = await context2.newPage();
  const url = page.url().includes("/watch/") ? page.url() : BASE + "/";
  await page2.goto(BASE + "/channel/laugh-track");
  const href = await page2.locator("a[href^='/watch/']").first().getAttribute("href");
  await page2.goto(BASE + href);
  await page2.waitForSelector("video");
  await context2.close();
  void url;
});

await step("demo account sees and accepts the friend request", async () => {
  const context3 = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const page3 = await context3.newPage();
  await page3.goto(BASE + "/login");
  await page3.click("text=Welcome back");
  await page3.fill('input[placeholder="like sunny_dan"]', "demo");
  await page3.fill('input[type="password"]', "reely123");
  await page3.click('button:has-text("Sign in")');
  await page3.waitForURL(BASE + "/");
  await page3.goto(BASE + "/friends");
  await page3.waitForSelector("text=Wants to be your friend");
  await page3
    .locator("div", { hasText: "E2E Tester" })
    .locator('button:has-text("Yes!")')
    .last()
    .click();
  await page3.waitForSelector(`a[href="/creator/${username}"]`);
  await context3.close();
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
