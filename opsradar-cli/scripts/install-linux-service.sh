#!/usr/bin/env bash
# Install OpsRadar CLI agent as a systemd service (Linux).
# Prerequisites: Node.js 18+, systemd, root (or sudo).
# Usage:
#   sudo ./scripts/install-linux-service.sh
#   sudo ./scripts/install-linux-service.sh --cli-dir /opt/opsradar-cli --user opsradar
#   sudo ./scripts/install-linux-service.sh --uninstall

set -euo pipefail

SERVICE_NAME="opsradar-agent"
UNIT_NAME="${SERVICE_NAME}.service"
UNIT_DEST="/etc/systemd/system/${UNIT_NAME}"
CLI_DIR=""
NODE_PATH=""
RUN_USER=""
UNINSTALL=0

usage() {
  cat <<'EOF'
Install OpsRadar CLI as a systemd service (Restart=always).

Options:
  --cli-dir DIR     Path to opsradar-cli (default: parent of scripts/)
  --node PATH       node binary (default: $(command -v node))
  --user NAME       Run as this system user (default: root / current install user)
  --service NAME    systemd unit name without .service (default: opsradar-agent)
  --uninstall       Stop, disable, and remove the unit
  -h, --help        Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cli-dir) CLI_DIR="$2"; shift 2 ;;
    --node) NODE_PATH="$2"; shift 2 ;;
    --user) RUN_USER="$2"; shift 2 ;;
    --service) SERVICE_NAME="$2"; UNIT_NAME="${SERVICE_NAME}.service"; UNIT_DEST="/etc/systemd/system/${UNIT_NAME}"; shift 2 ;;
    --uninstall) UNINSTALL=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -z "$CLI_DIR" ]]; then
  CLI_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi
CLI_DIR="$(cd "$CLI_DIR" && pwd)"
CLI_JS="${CLI_DIR}/cli.js"
UNIT_SRC="${CLI_DIR}/systemd/opsradar-agent.service"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

if [[ "$UNINSTALL" -eq 1 ]]; then
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "$UNIT_DEST"
  systemctl daemon-reload
  echo "Removed ${UNIT_NAME}."
  exit 0
fi

if [[ ! -f "$CLI_JS" ]]; then
  echo "cli.js not found in ${CLI_DIR}" >&2
  exit 1
fi
if [[ ! -f "$UNIT_SRC" ]]; then
  echo "Unit template missing: ${UNIT_SRC}" >&2
  exit 1
fi
if [[ ! -f "${CLI_DIR}/config.yaml" && ! -f "${CLI_DIR}/config.local.yaml" ]]; then
  echo "Warning: no config.yaml / config.local.yaml — copy config.example.yaml and set api_key / server_name before relying on the agent." >&2
fi

if [[ -z "$NODE_PATH" ]]; then
  NODE_PATH="$(command -v node || true)"
fi
if [[ -z "$NODE_PATH" || ! -x "$NODE_PATH" ]]; then
  echo "node not found; install Node.js 18+ or pass --node /path/to/node" >&2
  exit 1
fi

# Resolve real path (nvm/symlinks)
NODE_PATH="$(readlink -f "$NODE_PATH" 2>/dev/null || realpath "$NODE_PATH" 2>/dev/null || echo "$NODE_PATH")"

TMP_UNIT="$(mktemp)"
trap 'rm -f "$TMP_UNIT"' EXIT

# Fill WorkingDirectory / ExecStart / log paths; optional User=
sed \
  -e "s|^WorkingDirectory=.*|WorkingDirectory=${CLI_DIR}|" \
  -e "s|^ExecStart=.*|ExecStart=${NODE_PATH} ${CLI_DIR}/cli.js --agent|" \
  -e "s|^StandardOutput=.*|StandardOutput=append:${CLI_DIR}/agent-stdout.log|" \
  -e "s|^StandardError=.*|StandardError=append:${CLI_DIR}/agent-stderr.log|" \
  "$UNIT_SRC" > "$TMP_UNIT"

if [[ -n "$RUN_USER" ]]; then
  if ! id "$RUN_USER" &>/dev/null; then
    echo "User '${RUN_USER}' does not exist." >&2
    exit 1
  fi
  # Insert User= after Type=simple
  awk -v u="$RUN_USER" '
    /^Type=simple$/ { print; print "User=" u; print "Group=" u; next }
    { print }
  ' "$TMP_UNIT" > "${TMP_UNIT}.u"
  mv "${TMP_UNIT}.u" "$TMP_UNIT"
  chown -R "${RUN_USER}:${RUN_USER}" "$CLI_DIR" || true
fi

install -m 0644 "$TMP_UNIT" "$UNIT_DEST"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"

echo "Service ${SERVICE_NAME} installed and started (Restart=always)."
echo "Status:  systemctl status ${SERVICE_NAME}"
echo "Logs:    journalctl -u ${SERVICE_NAME} -f"
echo "         or ${CLI_DIR}/agent-stdout.log / agent-stderr.log"
echo "Stop:    systemctl stop ${SERVICE_NAME}"
echo "Restart: systemctl restart ${SERVICE_NAME}"
echo "Remove:  sudo $0 --uninstall --service ${SERVICE_NAME}"
