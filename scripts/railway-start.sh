#!/usr/bin/env bash
# Railway boot script: persist SQLite + uploaded media on the mounted volume.
# The app hardcodes MEDIA_ROOT to ./media, so we move media onto the volume
# and symlink it back. DATABASE_URL should point inside the volume too
# (e.g. file:/data/gasp.db). Idempotent across restarts and redeploys.
set -euo pipefail

VOL="${MEDIA_VOLUME:-/data}"

mkdir -p "$VOL/media/videos" "$VOL/media/thumbs" "$VOL/media/uploads"

# First deploy: copy the baked-in demo media into the volume (no clobber),
# then replace ./media with a symlink onto the volume.
if [ -d media ] && [ ! -L media ]; then
  cp -rn media/. "$VOL/media/" 2>/dev/null || true
  rm -rf media
fi
ln -sfn "$VOL/media" media

# Create/upgrade the schema on the volume DB (additive; safe on restart).
npx prisma db push --skip-generate

# Seed demo content exactly once. npm run seed uses --env-file=.env, which
# must exist even when empty (Railway injects env directly).
touch .env
if [ ! -f "$VOL/.seeded" ] && [ "${SEED_ON_FIRST_BOOT:-1}" = "1" ]; then
  npm run seed
  touch "$VOL/.seeded"
fi

exec npm start
