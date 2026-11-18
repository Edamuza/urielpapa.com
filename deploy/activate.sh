#!/usr/bin/env bash
# Switches the VPS to a release that the deploy workflow has just uploaded,
# restarts the server, and rolls back if it does not come up.
# Runs on the VPS as the urielpapa user: activate.sh <release-name>
set -euo pipefail

BASE=/srv/urielpapa.com
RELEASE="$1"
NEW="$BASE/releases/$RELEASE"
KEEP=5

[ -f "$NEW/server/entry.mjs" ] || { echo "No release at $NEW" >&2; exit 1; }
PREV=$(readlink -f "$BASE/current" 2>/dev/null || true)

switch_to() {
  ln -sfn "$1" "$BASE/current.tmp"
  mv -T "$BASE/current.tmp" "$BASE/current"
  sudo /usr/bin/systemctl restart urielpapa.service
}

healthy() {
  for _ in $(seq 1 20); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4321/keystatic || true)
    [ "$code" = 200 ] && return 0
    sleep 0.5
  done
  return 1
}

switch_to "$NEW"
if ! healthy; then
  echo "The new release did not answer on 127.0.0.1:4321." >&2
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    echo "Rolling back to $(basename "$PREV")." >&2
    switch_to "$PREV"
  fi
  exit 1
fi
echo "Live: $RELEASE"

# Keep the newest few releases for rollback; never the live one.
cd "$BASE/releases"
ls -1t | tail -n +$((KEEP + 1)) | while read -r old; do
  [ "$BASE/releases/$old" = "$(readlink -f "$BASE/current")" ] || rm -rf -- "$old"
done
