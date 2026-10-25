#!/usr/bin/env bash
set -euo pipefail

PORT="${STORYBOOK_TEST_PORT:-6006}"
HOST="${STORYBOOK_TEST_HOST:-127.0.0.1}"
PROTOCOL="${STORYBOOK_TEST_PROTOCOL:-http}"
URL="${PROTOCOL}://${HOST}:${PORT}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BIN_DIR="${ROOT_DIR}/node_modules/.bin"
STATIC_DIR="${ROOT_DIR}/storybook-static"

export CI="${CI:-1}"
export STORYBOOK_DISABLE_TELEMETRY=1

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ "${STORYBOOK_TEST_SKIP_BUILD:-0}" != "1" ]]; then
  if [[ ! -d "${STATIC_DIR}" || "${STORYBOOK_TEST_FORCE_REBUILD:-0}" == "1" ]]; then
    echo "Building Storybook preview..."
    "${BIN_DIR}/storybook" build --output-dir "${STATIC_DIR}" --disable-telemetry --quiet
  fi
fi

if [[ ! -d "${STATIC_DIR}" ]]; then
  echo "Storybook static assets not found at ${STATIC_DIR}." >&2
  exit 1
fi

python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${STATIC_DIR}" >/dev/null 2>&1 &
SERVER_PID=$!

ATTEMPTS="${STORYBOOK_TEST_WAIT_ATTEMPTS:-30}"
SLEEP_SECONDS="${STORYBOOK_TEST_WAIT_INTERVAL:-2}"
READY=0

for attempt in $(seq 1 "${ATTEMPTS}"); do
  if curl --silent --fail "${URL}" >/dev/null; then
    READY=1
    break
  fi
  sleep "${SLEEP_SECONDS}"
  echo "Waiting for Storybook at ${URL} (${attempt}/${ATTEMPTS})..."
done

if [[ "${READY}" -ne 1 ]]; then
  echo "Storybook failed to become ready at ${URL} after ${ATTEMPTS} attempts." >&2
  exit 1
fi

"${BIN_DIR}/test-storybook" --url "${URL}" "$@"
