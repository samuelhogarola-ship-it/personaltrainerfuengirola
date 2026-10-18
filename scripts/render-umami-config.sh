#!/bin/sh
set -eu

personal_host='https://analytics.187.124.55.36.sslip.io'
template_path="${UMAMI_CONFIG_TEMPLATE:-config/umami-config.template.json}"
output_path="${UMAMI_CONFIG_OUTPUT:-umami-config.json}"

UMAMI_SCRIPT_URL="${UMAMI_SCRIPT_URL:-${personal_host}/script.js}"
UMAMI_HOST_URL="${UMAMI_HOST_URL:-${personal_host}}"
UMAMI_WEBSITE_ID="${UMAMI_WEBSITE_ID:-f712523b-142d-4e87-a2d8-8d09876a04ec}"

if [ "$UMAMI_SCRIPT_URL" != "${personal_host}/script.js" ]; then
  echo 'UMAMI_SCRIPT_URL must point to the personal Umami instance' >&2
  exit 1
fi

if [ "$UMAMI_HOST_URL" != "$personal_host" ]; then
  echo 'UMAMI_HOST_URL must point to the personal Umami instance' >&2
  exit 1
fi

case "$UMAMI_WEBSITE_ID" in
  *[!A-Za-z0-9-]*)
    echo 'UMAMI_WEBSITE_ID contains unsupported characters' >&2
    exit 1
    ;;
esac

sed \
  -e "s|__UMAMI_SCRIPT_URL__|$UMAMI_SCRIPT_URL|g" \
  -e "s|__UMAMI_HOST_URL__|$UMAMI_HOST_URL|g" \
  -e "s|__UMAMI_WEBSITE_ID__|$UMAMI_WEBSITE_ID|g" \
  "$template_path" > "$output_path"
