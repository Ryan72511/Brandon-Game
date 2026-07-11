// Seeds Reely with creators, viewers, prebuilt channels, videos, ratings,
// timecoded comments, friendships, and watch history. Idempotent: wipes and
// re-seeds. Run generate-videos.mjs first so the media files exist.
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import {
  CREATORS,
  VIEWERS,
  SERIES,
  VIDEOS,
  PREBUILT_CHANNELS,
  SEED_COMMENTS,
  DEMO_PASSWORD,
} from "../scripts/seed-data.mjs";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// Deterministic PRNG so every seed run produces the same world.
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

// Rating profiles: [chance burnt, chance popped, chance butter] + count range.
const QUALITY_PROFILES = {
  great: { weights: [0.06, 0.45, 0.49], min: 9, max: 16 },
  good: { weights: [0.15, 0.55, 0.3], min: 6, max: 12 },
  mixed: { weights: [0.42, 0.4, 0.18], min: 5, max: 9 },
  poor: { weights: [0.7, 0.22, 0.08], min: 5, max: 8 },
};

function pickRating(weights) {
  const r = rand();
  if (r < weights[0]) return "burnt";
  if (r < weights[0] + weights[1]) return "popped";
  return "butter";
}

async function main() {
  console.log("Wiping…");
  // Order matters for FK constraints.
  await prisma.watchEvent.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.channelVideo.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.video.deleteMany();
  await prisma.series.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  console.log("Users…");
  const users = {};
  for (const c of CREATORS) {
    users[c.username] = await prisma.user.create({
      data: {
        username: c.username,
        displayName: c.displayName,
        avatarEmoji: c.avatarEmoji,
        avatarColor: c.avatarColor,
        bio: c.bio,
        mode: "creating",
        creatorAbout: c.creatorAbout,
        creatorTools: JSON.stringify(c.creatorTools),
        creatorProcess: c.creatorProcess,
        passwordHash: hashPassword(DEMO_PASSWORD),
        createdAt: daysAgo(90),
      },
    });
  }
  for (const v of VIEWERS) {
    users[v.username] = await prisma.user.create({
      data: {
        username: v.username,
        displayName: v.displayName,
        avatarEmoji: v.avatarEmoji,
        avatarColor: v.avatarColor,
        passwordHash: hashPassword(DEMO_PASSWORD),
        createdAt: daysAgo(60),
      },
    });
  }

  console.log("Series + videos…");
  const seriesRows = {};
  for (const s of SERIES) {
    seriesRows[s.key] = await prisma.series.create({
      data: {
        title: s.title,
        description: s.description,
        creatorId: users[s.creator].id,
        createdAt: daysAgo(45),
      },
    });
  }

  const videoRows = {};
  for (const [i, v] of VIDEOS.entries()) {
    videoRows[v.slug] = await prisma.video.create({
      data: {
        creatorId: users[v.creator].id,
        title: v.title,
        description: v.description ?? "",
        backstory: v.backstory ?? "",
        src: `/media/videos/${v.slug}.mp4`,
        thumb: `/media/thumbs/${v.slug}.jpg`,
        durationSec: v.dur,
        category: v.category,
        tags: JSON.stringify(v.tags ?? []),
        seriesId: v.series ? seriesRows[v.series].id : null,
        episodeNumber: v.ep ?? null,
        createdAt: daysAgo(2 + ((i * 7) % 40)),
      },
    });
  }

  console.log("Prebuilt channels…");
  const channels = {};
  for (const ch of PREBUILT_CHANNELS) {
    channels[ch.slug] = await prisma.channel.create({
      data: {
        slug: ch.slug,
        name: ch.name,
        emoji: ch.emoji,
        description: ch.description,
        category: ch.category,
        kind: ch.kind,
        isPrebuilt: true,
        createdAt: daysAgo(90),
      },
    });
    if (ch.kind === "normal") {
      const matching = VIDEOS.filter((v) => v.category === ch.category);
      for (const v of matching) {
        await prisma.channelVideo.create({
          data: { channelId: channels[ch.slug].id, videoId: videoRows[v.slug].id },
        });
      }
    }
  }

  console.log("Ratings…");
  const raters = [...VIEWERS.map((v) => v.username), ...CREATORS.map((c) => c.username)];
  for (const v of VIDEOS) {
    const profile = QUALITY_PROFILES[v.quality] ?? QUALITY_PROFILES.good;
    const count = profile.min + Math.floor(rand() * (profile.max - profile.min + 1));
    const shuffled = [...raters].sort(() => rand() - 0.5).slice(0, count);
    const counts = { burnt: 0, popped: 0, butter: 0 };
    for (const username of shuffled) {
      if (users[username].id === videoRows[v.slug].creatorId) continue;
      const value = pickRating(profile.weights);
      counts[value]++;
      await prisma.rating.create({
        data: {
          userId: users[username].id,
          videoId: videoRows[v.slug].id,
          value,
          // Half the ratings land inside the last 7 days so the weekly
          // chart has something to say.
          createdAt: rand() < 0.5 ? daysAgo(rand() * 6) : daysAgo(8 + rand() * 40),
        },
      });
    }
    const total = counts.burnt + counts.popped + counts.butter;
    const fresh = counts.popped + counts.butter;
    const m = 5;
    await prisma.video.update({
      where: { id: videoRows[v.slug].id },
      data: {
        burntCount: counts.burnt,
        poppedCount: counts.popped,
        butterCount: counts.butter,
        popcornScore: Math.round((100 * (fresh + m * 0.5)) / (total + m)),
        viewCount: 40 + Math.floor(rand() * 400),
      },
    });
  }

  console.log("Comments…");
  for (const v of VIDEOS) {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const c = pick(SEED_COMMENTS);
      await prisma.comment.create({
        data: {
          userId: users[pick(raters)].id,
          videoId: videoRows[v.slug].id,
          text: c.text,
          timecodeSec: c.tc ? Math.floor(rand() * v.dur) : null,
          createdAt: daysAgo(rand() * 20),
        },
      });
    }
  }

  console.log("Friends, follows, demo data…");
  const demo = users["demo"];
  const befriend = (a, b, status) =>
    prisma.friendship.create({
      data: {
        requesterId: a.id,
        addresseeId: b.id,
        pairKey: [a.id, b.id].sort().join(":"),
        status,
      },
    });
  // Demo user: friends with two, one pending request waiting (to show the flow).
  await befriend(demo, users["grandma_rose"], "accepted");
  await befriend(users["movie_mike"], demo, "accepted");
  await befriend(users["binge_bee"], demo, "pending");
  await befriend(users["sunny_sam"], users["grandma_rose"], "accepted");

  // Demo user's own channel with a few saves — gives recommendations a taste.
  // A custom-category channel: the maker named their own genre.
  const demoChannel = await prisma.channel.create({
    data: {
      slug: "demo-feel-good-mix",
      name: "Feel Good Mix",
      emoji: "🌈",
      description: "Things that make the day better.",
      category: "custom",
      customCategory: "Feel Good",
      ownerId: demo.id,
    },
  });
  for (const slug of ["spark-monday", "biscuit-heist", "onepan-pasta", "breakroom-ep1"]) {
    await prisma.channelVideo.create({
      data: { channelId: demoChannel.id, videoId: videoRows[slug].id },
    });
  }
  await prisma.follow.create({
    data: { userId: demo.id, channelId: channels["critter-corner"].id },
  });
  await prisma.follow.create({
    data: { userId: users["grandma_rose"].id, channelId: channels["meet-cute"].id },
  });

  // Watch history for the demo user (feeds recs).
  for (const slug of ["spark-monday", "biscuit-heist", "waffle-doorbell", "locket-ep1"]) {
    await prisma.watchEvent.create({
      data: { userId: demo.id, videoId: videoRows[slug].id, watchedAt: daysAgo(rand() * 5) },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    videos: await prisma.video.count(),
    channels: await prisma.channel.count(),
    ratings: await prisma.rating.count(),
    comments: await prisma.comment.count(),
  };
  console.log("Seeded:", counts);
  console.log(`\nDemo sign-in → username: demo  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
