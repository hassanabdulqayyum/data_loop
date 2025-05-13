#!/usr/bin/env bash

###############################################################################
# start_ngrok_tunnels.sh – Convenience wrapper to expose local Neo4j + Redis #
# via ngrok so Vercel preview builds can reach your laptop.                   #
#                                                                             #
# HOW IT WORKS (in plain language)                                            #
# 1. We verify that the `ngrok` command is available and has an auth-token     #
#    configured. Without these, ngrok refuses to open tunnels.                #
# 2. We open TWO background ngrok TCP tunnels:                                #
#       • One maps *public* random-host:port  ➜  localhost:7687  (Neo4j Bolt) #
#       • One maps *public* random-host:port  ➜  localhost:6379  (Redis)      #
# 3. We watch each ngrok process log until it prints the line that contains   #
#    the public forwarding address (looks like `tcp://0.tcp.ngrok.io:12345`). #
# 4. We turn those addresses into connection strings that your code expects   #
#    and *echo* them to the terminal so you can copy-paste them straight into #
#    the Vercel dashboard or run `vercel env add …`.                          #
# 5. The script then keeps running *in the foreground* so the tunnels stay    #
#    alive. Hit Ctrl-C when you are done testing to close everything.         #
#                                                                             #
# EXAMPLE USAGE                                                                #
#   $ bash scripts/start_ngrok_tunnels.sh                                      #
#   ✔ ngrok installed – v3.11.0                                               #
#   ✔ ngrok authtoken found                                                   #
#   ⏳ Starting Neo4j tunnel on port 7687 …                                    #
#   ⏳ Starting Redis tunnel on port 6379 …                                    #
#   -------------------------------------------------------------------       #
#   Copy these values into Vercel → Project → Settings → Environment Variables #
#                                                                             #
#   NEO4J_URI  = bolt://0.tcp.ngrok.io:14786                                  #
#   REDIS_URL  = redis://0.tcp.ngrok.io:12043                                 #
#   -------------------------------------------------------------------       #
#   (Leave this terminal window open; Ctrl-C to close both tunnels)           #
#                                                                             #
# Author: Adaptive-Delegation AI assistant                                     #
###############################################################################

set -euo pipefail

# Colours for pretty output (works in most terminals)
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

# -------- Helper functions --------------------------------------------------

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

print_ok() {
  echo -e "${GREEN}✔${RESET} $1"
}

print_wait() {
  echo -e "${YELLOW}⏳${RESET} $1"
}

print_error() {
  echo -e "${RED}✖${RESET} $1" >&2
}

# -------- Pre-flight checks --------------------------------------------------

if ! command_exists ngrok; then
  print_error "ngrok CLI is not installed. Please run 'brew install --cask ngrok' first." && exit 1
fi

NGROK_VERSION=$(ngrok version | head -n1 | awk '{print $3}') || NGROK_VERSION="unknown"
print_ok "ngrok installed – ${NGROK_VERSION}"

# ---------------------------------------------------------------------------
# Detect whether an auth-token is configured. We try **three** strategies so the
# script works across ngrok v2 (config in ~/.ngrok2) *and* v3 (config in
# ~/.config/ngrok) and even when users set the token via the NGROK_AUTHTOKEN
# environment variable. If *none* of the strategies succeed we bail out with a
# helpful hint.
# ---------------------------------------------------------------------------

has_ngrok_token() {
  # 1) Newer ngrok CLI exposes a sub-command that prints the token if present.
  if ngrok config get authtoken >/dev/null 2>&1; then
    return 0
  fi

  # 2) Check v3 default path: ~/.config/ngrok/ngrok.yml
  if grep -q "authtoken" "$HOME/.config/ngrok/ngrok.yml" 2>/dev/null; then
    return 0
  fi

  # 3) Check v2 legacy path: ~/.ngrok2/ngrok.yml
  if grep -q "authtoken" "$HOME/.ngrok2/ngrok.yml" 2>/dev/null; then
    return 0
  fi

  # 4) Finally, honour an environment variable if the user prefers not to
  # touch the YAML at all.
  if [[ -n "${NGROK_AUTHTOKEN:-}" ]]; then
    return 0
  fi

  return 1  # token not found
}

if ! has_ngrok_token; then
  print_error "ngrok authtoken not found. Run 'ngrok config add-authtoken <TOKEN>' and then re-run this script." && exit 1
fi

print_ok "ngrok authtoken found"

# -------- Start tunnels -----------------------------------------------------

# Create temporary log files so we can read the forwarding addresses.
NEO4J_LOG=$(mktemp)
REDIS_LOG=$(mktemp)

# Ensure temporary files are removed on exit.
cleanup() {
  rm -f "$NEO4J_LOG" "$REDIS_LOG"
}
trap cleanup EXIT

print_wait "Starting Neo4j tunnel on port 7687 …"
# Run ngrok in background, log JSON to stdout so we can parse.
ngrok tcp 7687 --log=stdout --log-format=json > "$NEO4J_LOG" 2>&1 &
NEO4J_NGROK_PID=$!

print_wait "Starting Redis tunnel on port 6379 …"
ngrok tcp 6379 --log=stdout --log-format=json > "$REDIS_LOG" 2>&1 &
REDIS_NGROK_PID=$!

# Function that waits for a forwarding address to appear in a given log file.
wait_for_tunnel() {
  local log_file="$1"
  # Allow callers to override the wait timeout via ENV so slow networks don't trip the script.
  local timeout=${TUNNEL_TIMEOUT:-45}  # seconds (default 45)
  local elapsed=0
  while [[ $elapsed -lt $timeout ]]; do
    # Search for the first occurrence of a TCP forwarding address regardless of
    # the exact JSON key (`public_url`, `url`, etc.). This makes the parser
    # resilient across ngrok versions.
    if grep -qE "tcp://[A-Za-z0-9\.-]+:[0-9]+" "$log_file"; then
      # Extract *only* the first tcp://host:port substring and print it.
      grep -oE "tcp://[A-Za-z0-9\.-]+:[0-9]+" "$log_file" | head -n1 | tail -n1
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  # Optional: dump last log lines to aid debugging when timeout hits.
  if [[ -n "${DEBUG_NGROK_TUNNELS:-}" ]]; then
    print_error "Dumping last 15 log lines for debugging:"
    tail -n 15 "$log_file" >&2
  fi
  return 1  # timed out
}

# Extract the addresses.
NEO4J_ADDR=$(wait_for_tunnel "$NEO4J_LOG") || { print_error "Timed out waiting for Neo4j tunnel."; exit 1; }
REDIS_ADDR=$(wait_for_tunnel "$REDIS_LOG") || { print_error "Timed out waiting for Redis tunnel."; exit 1; }

# Convert to connection strings.
NEO4J_URI="bolt://${NEO4J_ADDR#tcp://}"
REDIS_URL="redis://${REDIS_ADDR#tcp://}"

printf "\n${YELLOW}-------------------------------------------------------------------${RESET}\n"
echo "Copy these values into Vercel → Project → Settings → Environment Variables"
printf "\nNEO4J_URI  = %s\n" "$NEO4J_URI"
printf "REDIS_URL  = %s\n" "$REDIS_URL"
printf "${YELLOW}-------------------------------------------------------------------${RESET}\n"

# Keep script running so tunnels persist.
wait 