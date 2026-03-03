#!/usr/bin/env bash
set -euo pipefail

SESSION="cc-usage-$$"
WORKDIR="${HOME}/.ccstatusline"

mkdir -p "$WORKDIR"

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

TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S%z" | sed -E 's/([0-9]{2})([0-9]{2})$/\1:\2/')
json_str() { if [[ -n "$1" ]]; then printf '"%s"' "$1"; else printf 'null'; fi; }

printf '{"timestamp":"%s","weekly_percent":%s,"weekly_reset":%s,"weekly_reset_cli":%s,"session_percent":%s,"session_reset":%s,"session_reset_cli":%s}\n' \
  "$TIMESTAMP" \
  "${WEEKLY_PCT:-null}" \
  "$(json_str "$WEEKLY_RESET_NORM")" \
  "$(json_str "$WEEKLY_RESET_CLI")" \
  "${SESSION_PCT:-null}" \
  "$(json_str "$SESSION_RESET_NORM")" \
  "$(json_str "$SESSION_RESET_CLI")"
