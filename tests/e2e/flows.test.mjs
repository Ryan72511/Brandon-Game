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

let recoveryCode = "";
await step("sign up: age gate + recovery code, then starter channel", async () => {
  await page.goto(BASE + "/login");
  await page.fill('input[placeholder="like sunny_dan"]', username);
  await page.fill('input[type="email"]', `${username}@example.com`);
  await page.fill('input[placeholder="like Sunny Dan"]', "E2E Tester");
  await page.fill('input[placeholder="e.g. 1998"]', "1998");
  await page.fill('input[type="password"]', "test1234");
  await page.click('button[type="submit"]');
  // The recovery-code screen shows before we continue.
  await page.waitForSelector("text=Save your recovery code");
  recoveryCode = (await page.locator("p.font-mono").first().innerText()).trim();
  assert.ok(recoveryCode.length > 0, "recovery code not shown");
  await page.click('button:has-text("I saved it")');
  await page.waitForURL(BASE + "/");
  await page.waitForSelector("video");
});

await step("under-13 signup is refused", async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/login");
  await p.fill('input[placeholder="like sunny_dan"]', `kid_${stamp}`);
  await p.fill('input[type="email"]', `kid_${stamp}@example.com`);
  await p.fill('input[placeholder="like Sunny Dan"]', "Too Young");
  await p.fill('input[placeholder="e.g. 1998"]', String(new Date().getFullYear() - 8));
  await p.fill('input[type="password"]', "test1234");
  await p.click('button[type="submit"]');
  await p.waitForSelector("text=/at least 13/");
  await ctx.close();
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

await step("create a channel: pick a genre, get a suggested name", async () => {
  await page.click('button:has-text("New channel")');
  await page.click('button:has-text("Comedy")');
  // The name auto-suggests "<name>'s Comedy Channel" — override for a stable slug.
  const nameInput = page.locator('input[placeholder^="Pick a category"]');
  const suggested = await nameInput.inputValue();
  if (!suggested.includes("Comedy")) throw new Error(`no auto-suggest, got "${suggested}"`);
  await nameInput.fill("E2E Test Channel");
  await page.click('button:has-text("Create channel")');
  await page.waitForURL(/\/channel\/e2e-test-channel/);
  await page.waitForSelector("text=E2E Test Channel");
});

await step("create a custom-category channel with an emoji", async () => {
  await page.goto(BASE + "/channels");
  await page.click('button:has-text("New channel")');
  await page.click('button:has-text("My own")');
  await page.fill('input[placeholder^="Like"]', "Trick Shots");
  await page.click('button:has-text("Create channel")');
  await page.waitForURL(/\/channel\/.+trick-shots/);
  await page.waitForSelector("text=Trick Shots");
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
  await page.locator('label:has-text("This is mine to share") input').check();
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

await step("search finds videos, creators, and channels", async () => {
  await page.goto(BASE + "/search?q=yogurt");
  await page.waitForSelector("text=The Last Yogurt");
  await page.goto(BASE + "/search?q=maya");
  await page.waitForSelector("text=Maya Makes");
  await page.goto(BASE + "/search?q=laugh");
  await page.waitForSelector("text=The Laugh Track");
});

await step("drafts stay out of search results", async () => {
  await page.goto(BASE + "/search?q=secret recipe");
  await page.waitForTimeout(600);
  const found = await page.locator("text=The Secret Recipe").count();
  assert.equal(found, 0, "draft video leaked into search");
});

await step("friend acceptance notified the requester", async () => {
  await page.goto(BASE + "/you");
  await page.waitForSelector("text=What's new");
  await page.waitForSelector("text=/\\d+ new/");
  await page.click("text=What's new");
  await page.waitForURL(/\/notifications/);
  await page.waitForSelector("text=said yes");
});

let captionedWatchUrl = "";
await step("captions: CC toggle appears and turns on", async () => {
  await page.goto(BASE + "/search?q=yogurt");
  const href = await page.locator("a[href^='/watch/']").first().getAttribute("href");
  await page.goto(BASE + href);
  captionedWatchUrl = page.url();
  await page.waitForSelector('button[aria-label="Turn captions on"]');
  await page.click('button[aria-label="Turn captions on"]');
  await page.waitForSelector('button[aria-pressed="true"][aria-label="Turn captions off"]');
});

await step("continue watching leads the home feed", async () => {
  // Use a video this account never autoplayed, so no completed event
  // exists: fetch one by search and post progress directly.
  const videoId = await page.evaluate(async () => {
    const res = await fetch("/api/search?q=noodle");
    const data = await res.json();
    const id = data.videos?.[0]?.id;
    await fetch(`/api/videos/${id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progressSec: 6, completed: false }),
    });
    return id;
  });
  assert.ok(videoId, "search returned no video for progress test");
  await page.goto(BASE + "/");
  await page.waitForSelector("text=Continue watching");
});

let studioVideoUrl = "";
await step("studio: analytics page shows and edit saves", async () => {
  await page.goto(BASE + "/studio");
  await page.click("text=E2E Upload Test");
  await page.waitForSelector("text=How it's doing");
  studioVideoUrl = page.url();
  const title = page.getByLabel("Title");
  await title.fill("E2E Upload Test v2");
  await page.click('button:has-text("Save")');
  await page.waitForSelector("text=Saved ✓");
});

await step("pin a comment as the creator", async () => {
  const videoId = new URL(studioVideoUrl).pathname.split("/")[3];
  await page.goto(BASE + `/watch/${videoId}`);
  await page.click('button:has-text("Comment")');
  await page.fill("textarea", "Pinning this one!");
  await page.click('button:has-text("Post")');
  await page.waitForSelector("text=Pinning this one!");
  await page.click('button:has-text("Pin to top")');
  await page.waitForSelector("text=Pinned");
  await page.keyboard.press("Escape");
});

await step("delete the video from the studio", async () => {
  await page.goto(studioVideoUrl);
  await page.click('button:has-text("Delete this video")');
  await page.click('button:has-text("Yes, delete it")');
  await page.waitForURL(/\/studio$/);
  await page.waitForTimeout(500);
  const left = await page.locator("text=E2E Upload Test v2").count();
  assert.equal(left, 0, "video still listed after delete");
});

await step("legal and support pages open", async () => {
  for (const [path, text] of [
    ["/about/guidelines", "Community guidelines"],
    ["/about/terms", "Terms of use"],
    ["/about/privacy", "Privacy policy"],
    ["/about/copyright", "Copyright"],
    ["/about/support", "Support"],
  ]) {
    await page.goto(BASE + path);
    await page.waitForSelector(`text=${text}`);
  }
});

await step("report a video from the detail sheet", async () => {
  await page.goto(captionedWatchUrl);
  await page.click("text=Tap for the full story");
  await page.click('button:has-text("Report this video")');
  await page.click('button:has-text("Spam or scam")');
  await page.waitForSelector("text=Thanks — our moderators will take a look.");
  await page.keyboard.press("Escape");
});

await step("blocking a creator hides their videos", async () => {
  await page.goto(BASE + "/creator/whodunit_wanda");
  await page.click('button:has-text("Block this creator")');
  await page.waitForSelector("text=You've blocked this creator");
  await page.goto(BASE + "/channel/whodunit-lane");
  await page.waitForTimeout(600);
  const visible = await page.locator("text=Gone Before Dessert").count();
  assert.equal(visible, 0, "blocked creator's video still visible in channel");
  await page.goto(BASE + "/search?q=locket");
  await page.waitForTimeout(600);
  const inSearch = await page.locator("text=Gone Before Dessert").count();
  assert.equal(inSearch, 0, "blocked creator's video still in search");
});

await step("moderator removes the reported video", async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const modPage = await ctx.newPage();
  await modPage.goto(BASE + "/login");
  await modPage.click("text=Welcome back");
  await modPage.fill('input[placeholder="like sunny_dan"]', "moderator");
  await modPage.fill('input[type="password"]', "reely123");
  await modPage.click('button:has-text("Sign in")');
  await modPage.waitForURL(BASE + "/");
  await modPage.goto(BASE + "/you");
  await modPage.waitForSelector('a[href="/admin"]');
  await modPage.goto(BASE + "/admin");
  await modPage.waitForSelector("text=Spam or scam");
  await modPage.click('button:has-text("Remove video")');
  await modPage.click('button:has-text("Yes, remove video")');
  await modPage.waitForTimeout(800);
  await ctx.close();
  // The removed video 404s for regular viewers.
  await page.goto(captionedWatchUrl);
  await page.waitForSelector("text=That one's not showing");
});

await step("creator cannot republish a moderator-removed video", async () => {
  // captionedWatchUrl's video was removed by the moderator above. Signed in
  // as its creator (the_dramatist), PATCH status:published must be refused.
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/login");
  await p.click("text=Welcome back");
  await p.fill('input[placeholder="like sunny_dan"]', "the_dramatist");
  await p.fill('input[type="password"]', "reely123");
  await p.click('button:has-text("Sign in")');
  await p.waitForURL(BASE + "/");
  const videoId = new URL(captionedWatchUrl).pathname.split("/")[2];
  const status = await p.evaluate(async (id) => {
    const res = await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    return res.status;
  }, videoId);
  assert.equal(status, 403, `expected 403 republishing removed video, got ${status}`);
  await ctx.close();
});

await step("forgot password: reset with the recovery code", async () => {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } });
  const p = await ctx.newPage();
  // Fresh throwaway account so we don't disturb the main test account.
  const ru = `reset_${stamp}`;
  await p.goto(BASE + "/login");
  await p.fill('input[placeholder="like sunny_dan"]', ru);
  await p.fill('input[type="email"]', `${ru}@example.com`);
  await p.fill('input[placeholder="like Sunny Dan"]', "Reset Tester");
  await p.fill('input[placeholder="e.g. 1998"]', "1990");
  await p.fill('input[type="password"]', "orig1234");
  await p.click('button[type="submit"]');
  await p.waitForSelector("text=Save your recovery code");
  const code = (await p.locator("p.font-mono").first().innerText()).trim();
  await p.click('button:has-text("I saved it")');
  await p.waitForURL(BASE + "/");
  // Sign out, then reset the password with the code.
  await p.goto(BASE + "/you");
  await p.click("text=Sign out");
  await p.goto(BASE + "/reset");
  await p.fill('input[placeholder="like sunny_dan"]', ru);
  await p.locator("input").nth(1).fill(code);
  await p.locator('input[type="password"]').fill("newpass99");
  await p.click('button[type="submit"]');
  await p.waitForSelector("text=Save your new recovery code");
  // Click through the card like a real user (this also lands us signed in).
  await p.click('button:has-text("I saved it")');
  await p.waitForURL(BASE + "/");
  // The new password now works.
  await p.goto(BASE + "/you");
  await p.click("text=Sign out");
  await p.goto(BASE + "/login");
  await p.click("text=Welcome back");
  await p.fill('input[placeholder="like sunny_dan"]', ru);
  await p.fill('input[type="password"]', "newpass99");
  await p.click('button:has-text("Sign in")');
  await p.waitForURL(BASE + "/");
  await ctx.close();
});

await step("signup requires a valid, unique email", async () => {
  const ctx = await browser.newContext();
  const req = ctx.request;
  const ip = "203.0.113.9";
  const hx = { "x-forwarded-for": ip };
  const base = { displayName: "Email Tester", birthYear: 1990, password: "pass1234" };
  // Missing email is rejected.
  const noEmail = await req.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { ...base, username: `em1_${stamp}` },
  });
  assert.equal(noEmail.status(), 400, "missing email should be rejected");
  // Malformed email is rejected.
  const badEmail = await req.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { ...base, username: `em2_${stamp}`, email: "not-an-email" },
  });
  assert.equal(badEmail.status(), 400, "malformed email should be rejected");
  // A good, unique email works.
  const shared = `dup_${stamp}@example.com`;
  const ok = await req.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { ...base, username: `em3_${stamp}`, email: shared },
  });
  assert.equal(ok.status(), 200, "valid unique email should succeed");
  // The same email can't be reused, even in a different case.
  const dup = await req.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { ...base, username: `em4_${stamp}`, email: shared.toUpperCase() },
  });
  assert.equal(dup.status(), 409, "duplicate email should be rejected");
  await ctx.close();
});

await step("brute-force wrong guesses can't lock the real owner out", async () => {
  // A unique X-Forwarded-For gives this test its own per-IP bucket, so the
  // shared suite traffic on "local" doesn't interfere with the assertion.
  const ctx = await browser.newContext();
  const req = ctx.request;
  const u = `dos_${stamp}`;
  const ip = "203.0.113.7";
  const hx = { "x-forwarded-for": ip };
  const su = await req.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { username: u, email: `${u}@example.com`, displayName: "DoS Target", birthYear: 1990, password: "right1234" },
  });
  assert.equal(su.ok(), true, "signup should succeed");
  // Attacker floods the victim's public username with wrong passwords, past
  // the burst so the account bucket empties (later tries even get 429'd).
  for (let i = 0; i < 9; i++) {
    await req.post(BASE + "/api/auth/login", {
      headers: hx,
      data: { username: u, password: "definitely-wrong" },
    });
  }
  // The real owner's CORRECT password still logs in — verify-first ordering
  // means a valid credential is never subject to the per-account throttle.
  const ok = await req.post(BASE + "/api/auth/login", {
    headers: hx,
    data: { username: u, password: "right1234" },
  });
  assert.equal(ok.status(), 200, "correct password must succeed despite the wrong-guess flood");
  await ctx.close();
});

await step("changing password logs out other sessions", async () => {
  const u = `pw_${stamp}`;
  const ip = "203.0.113.8";
  const hx = { "x-forwarded-for": ip };
  const authed = (r) => r.get(BASE + "/api/notifications?count=1");
  // Session A: the old/other session (imagine a stolen or shared cookie).
  const ctxA = await browser.newContext();
  const rA = ctxA.request;
  const su = await rA.post(BASE + "/api/auth/signup", {
    headers: hx,
    data: { username: u, email: `${u}@example.com`, displayName: "PW User", birthYear: 1990, password: "orig1234" },
  });
  assert.equal(su.ok(), true, "signup should succeed");
  assert.equal((await authed(rA)).status(), 200, "session A starts valid");
  // Session B: the real owner signs in fresh and changes the password.
  const ctxB = await browser.newContext();
  const rB = ctxB.request;
  await rB.post(BASE + "/api/auth/login", {
    headers: hx,
    data: { username: u, password: "orig1234" },
  });
  const chg = await rB.post(BASE + "/api/account/password", {
    headers: hx,
    data: { currentPassword: "orig1234", newPassword: "changed99" },
  });
  assert.equal(chg.ok(), true, "password change should succeed");
  // The actor (B) stays signed in; every other session (A) is evicted.
  assert.equal((await authed(rB)).status(), 200, "actor session stays signed in");
  assert.equal((await authed(rA)).status(), 401, "other session is logged out");
  await ctxA.close();
  await ctxB.close();
});

await step("delete account, then the login is gone", async () => {
  await page.goto(BASE + "/you");
  await page.click('button:has-text("Delete account")');
  await page.fill(`input[placeholder="${username}"]`, username);
  await page.click('button:has-text("Delete everything")');
  await page.waitForURL(BASE + "/");
  await page.goto(BASE + "/login");
  await page.click("text=Welcome back");
  await page.fill('input[placeholder="like sunny_dan"]', username);
  await page.fill('input[type="password"]', "test1234");
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector("text=Wrong username or password.");
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
