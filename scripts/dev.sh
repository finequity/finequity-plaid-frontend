#!/usr/bin/env bash
#
# One-command local dev for the finEQUITY subscriptions app.
#
#   ./scripts/dev.sh              # cloudflared tunnels in front of both servers
#   ./scripts/dev.sh --no-tunnel  # plain localhost (UI work only)
#
# What it does, in order:
#   1. Preflight: node (18+ for CRA, 22+ for wrangler via nvm), cloudflared, deps.
#   2. Opens a quick tunnel for :8787 (Worker) and one for :3000 (app).
#   3. Writes the two URLs into .env (REACT_APP_WORKER_URL) and
#      worker/.dev.vars (ALLOWED_ORIGIN) — every other key is left alone.
#   4. Starts `wrangler dev` and `npm start`, waits for both to answer.
#   5. Provisions a test user into local KV and mints a signed #uid&ts&proof URL.
#   6. On Ctrl-C: stops everything and restores .env / .dev.vars as they were.
#
# The proof in the printed URL expires after 15 minutes — press Enter in this
# terminal at any time to mint a fresh one.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WORKER_PORT=8787
APP_PORT=3000
RUN_DIR="$ROOT/.dev-run"
ENV_FILE="$ROOT/.env"
VARS_FILE="$ROOT/worker/.dev.vars"

USE_TUNNEL=1
KEEP_CONFIG=0
DEV_UID="test-user-1"
DEV_SECRET="dev-secret-1"
DEV_PHONE="415-555-1234"

while [ $# -gt 0 ]; do
  case "$1" in
    --no-tunnel|--local) USE_TUNNEL=0 ;;
    --keep-config)       KEEP_CONFIG=1 ;;
    --uid)               DEV_UID="$2"; shift ;;
    --secret)            DEV_SECRET="$2"; shift ;;
    --phone)             DEV_PHONE="$2"; shift ;;
    -h|--help)
      sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 1 ;;
  esac
  shift
done

# ── output helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
else B=""; G=""; Y=""; R=""; N=""; fi
step() { printf '%s==>%s %s\n' "$B" "$N" "$*"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '  %s!%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '%serror:%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

# ── cleanup ─────────────────────────────────────────────────────────────────
PIDS=""
CLEANED=0

# npm and wrangler both spawn children; walk the tree so nothing is orphaned.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill "$pid" 2>/dev/null
}

cleanup() {
  [ "$CLEANED" = 1 ] && return
  CLEANED=1
  echo
  step "Shutting down"
  for pid in $PIDS; do kill_tree "$pid"; done
  wait 2>/dev/null
  if [ "$KEEP_CONFIG" = 0 ]; then
    [ -f "$RUN_DIR/env.bak" ]      && cp "$RUN_DIR/env.bak" "$ENV_FILE"   && ok "restored .env"
    [ -f "$RUN_DIR/dev.vars.bak" ] && cp "$RUN_DIR/dev.vars.bak" "$VARS_FILE" && ok "restored worker/.dev.vars"
  else
    warn "--keep-config: .env and worker/.dev.vars left pointing at the (now dead) tunnels"
  fi
  ok "done"
}
trap cleanup EXIT INT TERM

# ── small utilities ─────────────────────────────────────────────────────────

# set_var FILE KEY VALUE — replace the active KEY= line, or append it.
set_var() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  if grep -qE "^[[:space:]]*${key}=" "$file" 2>/dev/null; then
    awk -v k="$key" -v v="$value" '
      $0 ~ "^[[:space:]]*"k"=" { print k"="v; next } { print }
    ' "$file" > "$tmp"
  else
    cat "$file" > "$tmp" 2>/dev/null
    [ -s "$tmp" ] && [ "$(tail -c1 "$tmp")" != "" ] && echo >> "$tmp"
    echo "${key}=${value}" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

get_var() { grep -E "^[[:space:]]*$2=" "$1" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' \r'; }

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# wait_http PORT LABEL TIMEOUT — any HTTP answer counts as "up".
wait_http() {
  local port="$1" label="$2" timeout="${3:-90}" i=0
  while [ "$i" -lt "$timeout" ]; do
    [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}/" --max-time 2)" != "000" ] && return 0
    i=$((i + 1)); sleep 1
  done
  return 1
}

# ── 1. preflight ────────────────────────────────────────────────────────────
step "Preflight"

# Homebrew isn't always on PATH in a non-login shell (cloudflared lives there).
for d in /opt/homebrew/bin /usr/local/bin; do
  case ":$PATH:" in *":$d:"*) ;; *) [ -d "$d" ] && PATH="$PATH:$d" ;; esac
done
export PATH

# nvm gives us node 22+ for wrangler while CRA keeps whatever is default.
NVM_SH=""
for c in "$HOME/.nvm/nvm.sh" "/opt/homebrew/opt/nvm/nvm.sh" "/usr/local/opt/nvm/nvm.sh"; do
  [ -s "$c" ] && NVM_SH="$c" && break
done
[ -n "$NVM_SH" ] && . "$NVM_SH" >/dev/null 2>&1

command -v node >/dev/null 2>&1 || die "node not found (install Node 18+, or fix your nvm setup)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "node $(node -v) is too old for the React app — need 18+"
ok "node $(node -v) for the React app"

# wrangler refuses to start on anything below Node 22.
WRANGLER_NVM=""
if [ "$NODE_MAJOR" -lt 22 ]; then
  if [ -n "$NVM_SH" ] && nvm version 22 >/dev/null 2>&1 && [ "$(nvm version 22)" != "N/A" ]; then
    WRANGLER_NVM="22"
  elif [ -n "$NVM_SH" ] && [ "$(nvm version node)" != "N/A" ] &&
       [ "$(nvm version node | sed 's/^v//' | cut -d. -f1)" -ge 22 ]; then
    WRANGLER_NVM="node"
  else
    die "wrangler needs Node 22+ (have $(node -v)). Install one: nvm install 22"
  fi
  ok "node $(nvm version "$WRANGLER_NVM") for wrangler (via nvm)"
else
  ok "node $(node -v) for wrangler"
fi

if [ "$USE_TUNNEL" = 1 ]; then
  command -v cloudflared >/dev/null 2>&1 ||
    die "cloudflared not found — 'brew install cloudflared', or run with --no-tunnel"
  ok "cloudflared $(cloudflared --version 2>&1 | awk '{print $3}')"
fi

for p in "$WORKER_PORT" "$APP_PORT"; do
  port_busy "$p" && die "port $p is already in use — stop what's on it first (lsof -nP -iTCP:$p -sTCP:LISTEN)"
done

[ -d "$ROOT/node_modules" ] || { step "Installing app dependencies"; npm install || die "npm install failed"; }

# wrangler is a devDependency of worker/, installed with the matching Node so
# its workerd binary is the right build.
if [ ! -x "$ROOT/worker/node_modules/.bin/wrangler" ]; then
  step "Installing Worker dependencies (wrangler)"
  (
    [ -n "$WRANGLER_NVM" ] && { . "$NVM_SH" >/dev/null 2>&1; nvm use "$WRANGLER_NVM" >/dev/null 2>&1; }
    cd "$ROOT/worker" && npm install
  ) || die "npm install in worker/ failed"
fi

mkdir -p "$RUN_DIR"
# The run dir holds a verbatim copy of worker/.dev.vars and wrangler's request
# log, which carries PROVISION_PATH_KEY in the provisioning URL. The repo's
# .gitignore already excludes it; this makes the directory ignore itself too, so
# the secrets stay out of a commit even if that line is ever lost.
printf '*\n' > "$RUN_DIR/.gitignore"
chmod 700 "$RUN_DIR" 2>/dev/null

# .env must exist for CRA; seed it if this is a fresh clone.
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
REACT_APP_WORKER_URL=http://localhost:8787
REACT_APP_SUPPORT_SCHEDULE_URL=
EOF
  warn "created .env (REACT_APP_SUPPORT_SCHEDULE_URL is empty — the CTA falls back to SMS)"
fi

# .dev.vars holds the Pipedream secrets; never overwrite an existing one.
if [ ! -f "$VARS_FILE" ]; then
  cat > "$VARS_FILE" <<EOF
# Local-only secrets for \`wrangler dev\` (gitignored — never commit).
ALLOWED_ORIGIN=http://localhost:${APP_PORT}

RETRIEVE_TRIGGER_URL=
RETRIEVE_TRIGGER_AUTH_TOKEN=
EXCHANGE_TRIGGER_URL=
EXCHANGE_TRIGGER_AUTH_TOKEN=
PROVISION_PATH_KEY=$(openssl rand -hex 24)
PIPEDREAM_SECRET=
EOF
  warn "created worker/.dev.vars with a fresh PROVISION_PATH_KEY"
  warn "fill in the Pipedream trigger URLs + tokens, or /transactions will fail"
fi

cp "$ENV_FILE"  "$RUN_DIR/env.bak"
cp "$VARS_FILE" "$RUN_DIR/dev.vars.bak"
chmod 600 "$RUN_DIR/env.bak" "$RUN_DIR/dev.vars.bak" 2>/dev/null
ok "backed up .env and worker/.dev.vars"

PROVISION_KEY="$(get_var "$VARS_FILE" PROVISION_PATH_KEY)"
[ -n "$PROVISION_KEY" ] || die "PROVISION_PATH_KEY missing from worker/.dev.vars"
[ -n "$(get_var "$VARS_FILE" RETRIEVE_TRIGGER_URL)" ] ||
  warn "RETRIEVE_TRIGGER_URL is empty in worker/.dev.vars — /transactions will error"

# ── 2. tunnels ──────────────────────────────────────────────────────────────
# Opened before the servers on purpose: the URLs are random per run and both
# config files need them before anything starts.
# start_tunnel PORT LOGFILE -> sets TUNNEL_URL. Deliberately not a $(...) call:
# the cloudflared pid has to land in $PIDS in *this* shell so cleanup can kill
# it. trycloudflare sometimes takes a minute to issue a URL and occasionally
# drops the request outright, so this waits generously and retries once.
TUNNEL_URL=""
start_tunnel() {
  local port="$1" log="$2" attempt pid i
  TUNNEL_URL=""
  for attempt in 1 2; do
    : > "$log"
    cloudflared tunnel --url "http://localhost:${port}" >>"$log" 2>&1 &
    pid=$!
    PIDS="$PIDS $pid"
    i=0
    while [ "$i" -lt 90 ]; do
      TUNNEL_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$log" | head -1)"
      [ -n "$TUNNEL_URL" ] && return 0
      kill -0 "$pid" 2>/dev/null || break
      i=$((i + 1)); sleep 1
    done
    kill_tree "$pid"
    [ "$attempt" = 1 ] && warn "no tunnel URL for :$port yet — retrying"
  done
  echo "gave up waiting for the :$port tunnel URL — see $log" >&2
  return 1
}

if [ "$USE_TUNNEL" = 1 ]; then
  step "Opening cloudflared quick tunnels"
  start_tunnel "$WORKER_PORT" "$RUN_DIR/tunnel-worker.log" || die "could not open the Worker tunnel"
  WORKER_ORIGIN="$TUNNEL_URL"
  ok "worker  $WORKER_ORIGIN  → :$WORKER_PORT"
  start_tunnel "$APP_PORT" "$RUN_DIR/tunnel-app.log" || die "could not open the app tunnel"
  APP_ORIGIN="$TUNNEL_URL"
  ok "app     $APP_ORIGIN  → :$APP_PORT"
else
  WORKER_ORIGIN="http://localhost:$WORKER_PORT"
  APP_ORIGIN="http://localhost:$APP_PORT"
  step "Tunnels skipped (--no-tunnel) — Glide iframe and Plaid production need https"
fi

# ── 3. wire the two sides together ──────────────────────────────────────────
step "Writing config"
set_var "$ENV_FILE"  REACT_APP_WORKER_URL "$WORKER_ORIGIN"
ok ".env            REACT_APP_WORKER_URL=$WORKER_ORIGIN"
set_var "$VARS_FILE" ALLOWED_ORIGIN "$APP_ORIGIN"
ok "worker/.dev.vars ALLOWED_ORIGIN=$APP_ORIGIN"

# ── 4. servers ──────────────────────────────────────────────────────────────
step "Checking wrangler"
WRANGLER_VERSION="$(
  [ -n "$WRANGLER_NVM" ] && { . "$NVM_SH" >/dev/null 2>&1; nvm use "$WRANGLER_NVM" >/dev/null 2>&1; }
  cd "$ROOT/worker" && WRANGLER_SEND_METRICS=false ./node_modules/.bin/wrangler --version 2>/dev/null | tail -1
)"
[ -n "$WRANGLER_VERSION" ] || die "worker/node_modules/.bin/wrangler would not run — try: cd worker && npm install"
ok "wrangler $WRANGLER_VERSION"

step "Starting the Worker (wrangler dev)"
(
  [ -n "$WRANGLER_NVM" ] && { . "$NVM_SH" >/dev/null 2>&1; nvm use "$WRANGLER_NVM" >/dev/null 2>&1; }
  cd "$ROOT/worker" || exit 1
  export WRANGLER_SEND_METRICS=false
  exec ./node_modules/.bin/wrangler dev --port "$WORKER_PORT"
) >"$RUN_DIR/worker.log" 2>&1 &
PIDS="$PIDS $!"
wait_http "$WORKER_PORT" worker 120 ||
  { tail -30 "$RUN_DIR/worker.log"; die "wrangler dev never came up — full log: $RUN_DIR/worker.log"; }
ok "worker listening on http://localhost:$WORKER_PORT"

step "Provisioning the test user in local KV"
PROV_CODE="$(curl -s -o "$RUN_DIR/provision.json" -w '%{http_code}' \
  -X POST "http://localhost:${WORKER_PORT}/provision/${PROVISION_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"params\":{\"userId\":\"${DEV_UID}\",\"userSecret\":\"${DEV_SECRET}\",\"phoneNumber\":\"${DEV_PHONE}\"}}")"
if [ "$PROV_CODE" = "200" ]; then
  ok "uid=$DEV_UID secret=$DEV_SECRET phone=$DEV_PHONE"
else
  warn "provision returned HTTP $PROV_CODE: $(cat "$RUN_DIR/provision.json")"
fi

step "Starting the React app (npm start)"
(
  cd "$ROOT" || exit 1
  export BROWSER=none
  [ "$USE_TUNNEL" = 1 ] && export WDS_SOCKET_PORT=443   # HMR websocket over the tunnel
  exec npm start
) >"$RUN_DIR/app.log" 2>&1 &
PIDS="$PIDS $!"
wait_http "$APP_PORT" app 180 ||
  { tail -30 "$RUN_DIR/app.log"; die "the dev server never came up — full log: $RUN_DIR/app.log"; }
ok "app listening on http://localhost:$APP_PORT"

# ── 5. what to open ─────────────────────────────────────────────────────────
mint() { node "$ROOT/worker/dev-url.mjs" "$DEV_SECRET" "$DEV_UID" "$APP_ORIGIN"; }

# The UI URL on its own line: that's the origin to paste into Glide's Web Embed.
# The signed one below it is what a browser needs to get past the proof check.
print_urls() {
  local signed; signed="$(mint)"
  echo
  if [ "$USE_TUNNEL" = 1 ]; then
    printf '%sUI (Cloudflare tunnel):%s\n\n  %s\n\n' "$B" "$N" "$APP_ORIGIN"
  else
    printf '%sUI:%s\n\n  %s\n\n' "$B" "$N" "$APP_ORIGIN"
  fi
  printf '%sSigned link — open this in a browser (proof valid 15 min):%s\n\n  %s\n\n' "$B" "$N" "$signed"
  command -v pbcopy >/dev/null 2>&1 && printf '%s' "$signed" | pbcopy && ok "signed link copied to clipboard"
}

echo
step "Ready"
echo "  UI        $APP_ORIGIN"
echo "  Worker    $WORKER_ORIGIN"
echo "  logs      $RUN_DIR/{worker,app,tunnel-worker,tunnel-app}.log"
print_urls
if [ -t 0 ]; then
  echo "Press Enter for a fresh signed link, Ctrl-C to stop everything."
  while read -r _; do print_urls; done
else
  wait
fi
