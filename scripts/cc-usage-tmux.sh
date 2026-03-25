#!/usr/bin/env bash
set -euo pipefail

SESSION="cc-usage-$$"
WORKDIR="${HOME}/.ccstatusline"
USAGE_DIR="${HOME}/.ccstatusline"
STDOUT_ONLY=false
CWD=""
STALE_SECONDS=600

while [[ $# -gt 0 ]]; do
  case "$1" in
    --std-out)
      STDOUT_ONLY=true
      shift
      ;;
    --cwd)
      CWD="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

slugify_cwd() {
  local p="$1"
  p="${p#"${HOME}/"}"
  p="${p#"${HOME}"}"
  [[ "$p" == .ccstatusline* ]] && { echo ""; return; }
  p=$(echo "$p" | tr '[:upper:]' '[:lower:]' | tr '/ ' '-')
  p="${p#-}"
  p="${p%-}"
  echo "$p"
}

if [[ -n "$CWD" ]]; then
  SLUG=$(slugify_cwd "$CWD")
  USAGE_CACHE_PATH="${USAGE_DIR}/usage-${SLUG}.json"
  USAGE_CACHE_TMP_PATH="${USAGE_DIR}/usage-${SLUG}.json.tmp"
else
  USAGE_CACHE_PATH="${USAGE_DIR}/usage.json"
  USAGE_CACHE_TMP_PATH="${USAGE_DIR}/usage.json.tmp"
fi

timestamp_now() {
  date +"%Y-%m-%dT%H:%M:%S%z" | sed -E 's/([0-9]{2})([0-9]{2})$/\1:\2/'
}

mkdir -p "$WORKDIR"

if [[ "$STDOUT_ONLY" == false && -f "$USAGE_CACHE_PATH" ]]; then
  NOW_EPOCH=$(date +%s)
  FILE_EPOCH=$(stat -f %m "$USAGE_CACHE_PATH" 2>/dev/null || echo 0)
  AGE=$((NOW_EPOCH - FILE_EPOCH))
  if [[ "$AGE" -lt "$STALE_SECONDS" ]]; then
    exit 0
  fi
fi

if [[ "$STDOUT_ONLY" == false ]]; then
  touch "$USAGE_CACHE_PATH"
fi

tmux new-session -d -s "$SESSION" -x 120 -y 40
tmux send-keys -t "$SESSION" "cd \"$WORKDIR\" && unset CLAUDECODE; claude /usage" Enter
sleep 4

INITIAL=$(tmux capture-pane -t "$SESSION" -S - -E - -p)
if echo "$INITIAL" | grep -q "Quick safety check"; then
  tmux send-keys -t "$SESSION" Enter
  sleep 8
else
  sleep 4
fi

tmux capture-pane -t "$SESSION" -S - -E - -b capture
CLEAN=$(tmux save-buffer -b capture -)
tmux delete-buffer -b capture 2>/dev/null
tmux kill-session -t "$SESSION" 2>/dev/null || true

extract_pct() {
  echo "$CLEAN" | awk -v h="$1" '
    $0 ~ h { found=1 }
    found && /[0-9]+% used/ {
      match($0, /[0-9]+% used/)
      pct = substr($0, RSTART, RLENGTH)
      sub(/% used/, "", pct)
      print pct
      exit
    }
  '
}

extract_reset() {
  echo "$CLEAN" | awk -v h="$1" '
    $0 ~ h { found=1 }
    found && /Resets/ {
      match($0, /Resets.*/)
      if (RSTART > 0) {
        result = substr($0, RSTART, RLENGTH)
        gsub(/\([^)]*\/[^)]*\)/, "", result)
        gsub(/[[:space:]]+$/, "", result)
        print result
      }
      exit
    }
  '
}

SESSION_PCT=$(extract_pct "Current session")
WEEKLY_PCT=$(extract_pct "Current week")
SESSION_RESET=$(extract_reset "Current session")
WEEKLY_RESET=$(extract_reset "Current week")

if [[ -z "$SESSION_PCT" && -z "$WEEKLY_PCT" ]]; then
  echo "Failed to parse Claude usage screen" >&2
  exit 1
fi

parse_time_to_epoch() {
  local time_str="$1"
  local hour min ampm

  if [[ "$time_str" =~ ^([0-9]+):([0-9]+)([ap]m)$ ]]; then
    hour="${BASH_REMATCH[1]}" min="${BASH_REMATCH[2]}" ampm="${BASH_REMATCH[3]}"
  elif [[ "$time_str" =~ ^([0-9]+)([ap]m)$ ]]; then
    hour="${BASH_REMATCH[1]}" min="00" ampm="${BASH_REMATCH[2]}"
  else
    return 1
  fi

  ampm=$(echo "$ampm" | tr 'ap' 'AP')
  printf -v hour "%02d" "$hour"
  date -j -f "%I:%M%p" "${hour}:${min}${ampm}" +%s 2>/dev/null
}

parse_date_time_to_epoch() {
  local month="$1" day="$2" time_str="$3"
  local hour min ampm

  if [[ "$time_str" =~ ^([0-9]+):([0-9]+)([ap]m)$ ]]; then
    hour="${BASH_REMATCH[1]}" min="${BASH_REMATCH[2]}" ampm="${BASH_REMATCH[3]}"
  elif [[ "$time_str" =~ ^([0-9]+)([ap]m)$ ]]; then
    hour="${BASH_REMATCH[1]}" min="00" ampm="${BASH_REMATCH[2]}"
  else
    return 1
  fi

  ampm=$(echo "$ampm" | tr 'ap' 'AP')
  printf -v hour "%02d" "$hour"
  printf -v day "%02d" "$day"
  local year; year=$(date +%Y)
  date -j -f "%b %d %Y %I:%M%p" "${month} ${day} ${year} ${hour}:${min}${ampm}" +%s 2>/dev/null
}

format_relative() {
  local diff="$1"
  local hours=$((diff / 3600))
  local mins=$(( (diff % 3600) / 60 ))
  local secs=$((diff % 60))
  local human=""

  [[ "$hours" -gt 0 ]] && human="${hours}h"
  if [[ "$mins" -gt 0 ]]; then
    [[ -n "$human" ]] && human="$human "
    human="${human}${mins}m"
  fi
  if [[ "$secs" -gt 0 && "$hours" -eq 0 ]]; then
    [[ -n "$human" ]] && human="$human "
    human="${human}${secs}s"
  fi
  [[ -z "$human" ]] && human="< 1m"
  echo "Resets in $human"
}

normalize_reset() {
  local raw="$1"
  local rest="${raw#Resets }"

  if [[ "$rest" =~ ^in\  ]]; then
    echo "$raw"
    return
  fi

  local target_epoch now_epoch
  now_epoch=$(date +%s)

  if [[ "$rest" =~ ^([A-Z][a-z]+)\ ([0-9]+)\ at\ (.+)$ ]]; then
    target_epoch=$(parse_date_time_to_epoch "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}") \
      || { echo "$raw"; return; }
  elif [[ "$rest" =~ ^([0-9]+:?[0-9]*[ap]m)$ ]]; then
    target_epoch=$(parse_time_to_epoch "${BASH_REMATCH[1]}") \
      || { echo "$raw"; return; }
    [[ "$target_epoch" -le "$now_epoch" ]] && target_epoch=$((target_epoch + 86400))
  else
    echo "$raw"
    return
  fi

  local diff=$((target_epoch - now_epoch))
  [[ "$diff" -le 0 ]] && { echo "$raw"; return; }
  format_relative "$diff"
}

normalize_weekly() {
  local raw="$1"
  local rest="${raw#Resets }"

  if [[ "$rest" =~ ^([A-Z][a-z]{2})\ ([0-9]+)\ at\ (.+)$ ]]; then
    local target_epoch
    target_epoch=$(parse_date_time_to_epoch "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}") \
      || { echo "$raw"; return; }
    local dow; dow=$(date -j -f "%s" "$target_epoch" "+%a")
    local fmt_time; fmt_time=$(date -j -f "%s" "$target_epoch" "+%-I:%M%p" | tr 'A-Z' 'a-z')
    echo "Resets $dow $fmt_time"
  else
    echo "$raw"
  fi
}

SESSION_RESET_CLI="$SESSION_RESET"
WEEKLY_RESET_CLI="$WEEKLY_RESET"
SESSION_RESET_NORM=$(normalize_reset "$SESSION_RESET")
WEEKLY_RESET_NORM=$(normalize_weekly "$WEEKLY_RESET")

MODEL_SESSION="cc-model-$$"
RAW_LOG="$(mktemp)"
CLEAN_LOG="$(mktemp)"

cleanup_model_capture() {
  tmux pipe-pane -t "$MODEL_SESSION" 2>/dev/null || true
  tmux kill-session -t "$MODEL_SESSION" 2>/dev/null || true
  rm -f "$RAW_LOG" "$CLEAN_LOG"
}

tmux new-session -d -s "$MODEL_SESSION" -x 140 -y 50
tmux pipe-pane -o -t "$MODEL_SESSION" "cat > '$RAW_LOG'"
tmux send-keys -t "$MODEL_SESSION" "cd \"$WORKDIR\" && unset CLAUDECODE; claude /model" Enter

sleep 5
tmux send-keys -t "$MODEL_SESSION" Escape
sleep 1

tmux pipe-pane -t "$MODEL_SESSION" 2>/dev/null || true
tmux kill-session -t "$MODEL_SESSION" 2>/dev/null || true

LC_ALL=C LANG=C perl -0pe '
  s/\e\][^\a]*(?:\a|\e\\)//gs;
  s/\e\[[0-9;?]*[ -\/]*[@-~]//g;
  s/\r/\n/g;
  s/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]//g;
' "$RAW_LOG" > "$CLEAN_LOG"

extract_model() {
  awk '
    match($0, /(Opus|Sonnet|Haiku)[[:space:]]*[0-9]+\.[0-9]+/) {
      value = substr($0, RSTART, RLENGTH)
      if (value ~ /^Opus[0-9]/) sub(/^Opus/, "Opus ", value)
      if (value ~ /^Sonnet[0-9]/) sub(/^Sonnet/, "Sonnet ", value)
      if (value ~ /^Haiku[0-9]/) sub(/^Haiku/, "Haiku ", value)
      print value
      exit
    }
  ' "$CLEAN_LOG"
}

extract_effort() {
  awk '
    match($0, /(Low|Medium|High)[[:space:]]*effort/) {
      value = substr($0, RSTART, RLENGTH)
      sub(/[[:space:]]*effort$/, "", value)
      print value
      exit
    }
  ' "$CLEAN_LOG"
}

MODEL_NAME=$(extract_model || true)
MODEL_EFFORT=$(extract_effort || true)

cleanup_model_capture

TIMESTAMP=$(timestamp_now)
json_str() { if [[ -n "$1" ]]; then printf '"%s"' "$1"; else printf 'null'; fi; }

JSON_OUTPUT=$(printf '{"timestamp":"%s","weekly_percent":%s,"weekly_reset":%s,"weekly_reset_cli":%s,"session_percent":%s,"session_reset":%s,"session_reset_cli":%s,"model":%s,"effort":%s}\n' \
  "$TIMESTAMP" \
  "${WEEKLY_PCT:-null}" \
  "$(json_str "$WEEKLY_RESET_NORM")" \
  "$(json_str "$WEEKLY_RESET_CLI")" \
  "${SESSION_PCT:-null}" \
  "$(json_str "$SESSION_RESET_NORM")" \
  "$(json_str "$SESSION_RESET_CLI")" \
  "$(json_str "$MODEL_NAME")" \
  "$(json_str "$MODEL_EFFORT")")

if [[ "$STDOUT_ONLY" == true ]]; then
  printf '%s' "$JSON_OUTPUT"
  exit 0
fi

printf '%s\n' "$JSON_OUTPUT" > "$USAGE_CACHE_TMP_PATH"
mv "$USAGE_CACHE_TMP_PATH" "$USAGE_CACHE_PATH"
