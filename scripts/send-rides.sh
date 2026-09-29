#!/bin/sh
# Sends the ride files in a folder to Kadence with a rider's upload key
# (docs/upload-keys.md, docs/adr/0029).
#
#   KADENCE_URL=https://kadence.example sh scripts/send-rides.sh /Volumes/GARMIN
#   KADENCE_URL=https://kadence.example sh scripts/send-rides.sh --all /Volumes/GARMIN
#
# The key is read from a file only its owner can read, ~/.kadence-key
# unless KADENCE_KEY_FILE names another, and handed to curl on standard
# input: it is never an argument, so it is not in the list of running
# programs. Where the folder has an activities folder in it, as a bike
# computer's drive has, only that is sent; the courses, workouts and
# settings beside it are files of the same kind and no rides.
#
# The newest ride is sent first: it is the one somebody is waiting for,
# and when Kadence asks for a pause it is the old rides that wait. What
# Kadence has answered for is remembered, by name and size, in a file
# beside the key (KADENCE_SENT_FILE names another), so the next run sends
# only what is new. --all forgets that for one run and sends everything;
# Kadence answers "already there" for the rides it has.
#
# curl reads none of its own configuration here (-q), so nothing in
# ~/.curlrc can make it print what it sends.
#
# Needs a shell and curl, which a Mac and a Linux machine have.
set -eu
umask 077

all=0
if [ "${1:-}" = "--all" ]; then
  all=1
  shift
fi
folder=${1:-}
url=${KADENCE_URL:-}
key_file=${KADENCE_KEY_FILE:-$HOME/.kadence-key}
sent_file=${KADENCE_SENT_FILE:-$key_file.sent}

if [ -z "$folder" ] || [ -z "$url" ]; then
  printf '%s\n' "usage: KADENCE_URL=https://your.kadence sh $0 [--all] <folder with rides>" >&2
  exit 2
fi
[ -d "$folder" ] || { printf '%s\n' "No such folder: $folder" >&2; exit 2; }
[ -r "$key_file" ] || {
  printf '%s\n' "No key in $key_file. Create one under Settings → Devices and save it there." >&2
  exit 2
}
if [ -n "$(find "$key_file" -prune \( -perm -040 -o -perm -004 \) -print 2>/dev/null)" ]; then
  printf '%s\n' "Others on this computer can read $key_file. Close it: chmod 600 $key_file" >&2
fi
key=$(tr -d ' \t\r\n' <"$key_file")
# The whole key, not its beginning: it goes into what curl reads as its
# configuration, and nothing but a key may.
if ! printf '%s' "$key" | grep -Eq '^kad_[A-Za-z0-9_-]{43}$'; then
  printf '%s\n' "$key_file does not hold an upload key (kad_ and 43 characters)." >&2
  exit 2
fi
# A key sent without encryption is a key given away. Only this machine
# itself is reached without it.
case $url in
  https://*) proto='=https' ;;
  http://localhost | http://localhost[:/]* | http://127.0.0.1 | http://127.0.0.1[:/]*) proto='=http,https' ;;
  *) printf '%s\n' "KADENCE_URL must begin with https://" >&2; exit 2 ;;
esac
url=${url%/}

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
# Stopped by hand, the script stops: it does not go on with the next file.
trap 'exit 130' INT
trap 'exit 143' TERM

tab=$(printf '\t')
newline='
'

# Every byte as %xx: a name may hold anything, an address may not.
encoded() {
  printf '%s' "$1" | od -An -v -tx1 | tr -s ' \n' '  ' | sed 's/^ //; s/ $//; s/ /%/g; s/^/%/'
}

# When a file was written and how large it is: one stat says it one way, the other another.
if stat -c '%Y %s' / >/dev/null 2>&1; then
  facts() { stat -c '%Y %s' "$1" 2>/dev/null || printf '0 0\n'; }
else
  facts() { stat -f '%m %z' "$1" 2>/dev/null || printf '0 0\n'; }
fi

# The files that may be rides: none hidden, none in a hidden folder (a
# drive's wastebasket is one), none empty. A folder that cannot be read
# is passed by; the rest is still sent.
rides_in() {
  find -H "$1" -mindepth 1 \
    \( -type d -name '.*' -prune \) -o \
    \( -type f -size +0 ! -name '.*' ! -name "*$newline*" \
    \( -iname '*.fit' -o -iname '*.tcx' -o -iname '*.gpx' -o -iname '*.gz' -o -iname '*.zip' \) \
    -print \) 2>/dev/null || true
}

# A line for a file: written, size, path.
listed() {
  # shellcheck disable=SC2046
  set -- "$1" $(facts "$1")
  printf '%s\t%s\t%s\n' "${2:-0}" "${3:-0}" "$1"
}

# One file: the status as the answer, what Kadence said in $work.
post() {
  code=$(
    printf 'header = "Authorization: Bearer %s"\nheader = "Content-Type: application/octet-stream"\n' "$key" |
      curl -q --silent --show-error --config - \
        --proto "$proto" --max-time 120 \
        --dump-header "$work/headers" --output "$work/body" \
        --write-out '%{http_code}' \
        --data-binary "@$1" \
        "$url/api/ingest?name=$(encoded "$(basename "$1")")" 2>"$work/error"
  ) || code=000
  printf '%s\n' "$code"
}

{
  find -H "$folder" -mindepth 1 -maxdepth 4 \( -type d -name '.*' -prune \) -o \
    \( -type d \( -iname activities -o -iname activity \) -print \) 2>/dev/null || true
} >"$work/folders"
if [ -s "$work/folders" ]; then
  while IFS= read -r inner; do rides_in "$inner"; done <"$work/folders" >"$work/found"
else
  rides_in "$folder" >"$work/found"
fi
while IFS= read -r file; do listed "$file"; done <"$work/found" |
  LC_ALL=C sort -t "$tab" -k1,1nr -k3 >"$work/files"

sent=0 known=0 refused=0 before=0
summary() {
  printf '%s\n' "$sent sent, $known already there, $refused refused, $before sent before and left alone."
}
remembered() { [ -f "$sent_file" ] && grep -Fxq -e "$1" "$sent_file"; }
remember() { remembered "$1" || printf '%s\n' "$1" >>"$sent_file"; }

while IFS="$tab" read -r written size file; do
  : "$written"
  name=$(basename "$file")
  record="$url$tab$size$tab$name"
  if [ "$all" -eq 0 ] && remembered "$record"; then
    before=$((before + 1))
    continue
  fi
  tries=0
  while :; do
    status=$(post "$file")
    case $status in
      201)
        sent=$((sent + 1))
        remember "$record"
        printf '%s\n' "sent      $name"
        break
        ;;
      200)
        known=$((known + 1))
        remember "$record"
        break
        ;;
      401)
        printf '%s\n' "Kadence does not know the key in $key_file. Was it removed? Create a new one." >&2
        summary
        exit 1
        ;;
      408)
        # The file did not get there in time: the line, not the file.
        tries=$((tries + 1))
        if [ "$tries" -gt 3 ]; then
          printf '%s\n' "$name does not get through. Run this again on a better line; nothing is lost." >&2
          summary
          exit 1
        fi
        sleep 5
        ;;
      429)
        tries=$((tries + 1))
        wait=$(tr -d '\r' <"$work/headers" | awk 'tolower($1) == "retry-after:" { print $2 }')
        case $wait in '' | *[!0-9]*) wait=60 ;; esac
        if [ "$tries" -gt 3 ] || [ "$wait" -gt 900 ]; then
          printf '%s\n' "Kadence asks for a pause of $wait seconds. Run this again later; nothing is lost." >&2
          summary
          exit 0
        fi
        sleep "$wait"
        ;;
      413 | 422)
        # About the file, and the same the next time: remembered like a ride that was sent.
        refused=$((refused + 1))
        remember "$record"
        printf '%s\n' "refused   $name: $(tr -d '\n' <"$work/body")" >&2
        break
        ;;
      400)
        refused=$((refused + 1))
        printf '%s\n' "refused   $name: $(tr -d '\n' <"$work/body")" >&2
        break
        ;;
      *)
        printf '%s\n' "No answer for $name (status $status). $(cat "$work/error")" >&2
        summary
        exit 1
        ;;
    esac
  done
done <"$work/files"

summary
