#!/usr/bin/env bash
set -euo pipefail

export npm_config_loglevel=error
export npm_config_update_notifier=false

run_unit_tests() {
  local package_dir="$1"

  (
    cd "$package_dir"
    npm run test:unit
  )
}

run_integration_tests() {
  local package_dir="$1"

  (
    cd "$package_dir"
    npm run test:integration
  )
}

status=0

run_unit_tests packages/uniku &
uniku_pid=$!

run_unit_tests packages/cli &
cli_pid=$!

wait "$uniku_pid" || status=$?
wait "$cli_pid" || status=$?

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

run_integration_tests packages/uniku
