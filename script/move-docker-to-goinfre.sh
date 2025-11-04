#!/usr/bin/env bash
set -euo pipefail

# move-docker-to-sgoinfre.sh
# Interactive script to set rootless Docker's data-root to /goinfre/$USER and
# optionally migrate existing docker data there. Safe prompts and backups.

GOINFRE_ROOT="/goinfre/$USER"
GOINFRE_DATA="$GOINFRE_ROOT/docker"
GOINFRE_CONF="$GOINFRE_ROOT/.config/docker"
HOME_CONF="$HOME/.config/docker"

echo "=== Docker GOINFRE setup helper ==="

if [ ! -d "$GOINFRE_ROOT" ]; then
  echo "ERROR: $GOINFRE_ROOT does not exist. Create it (or pick another location) and re-run." >&2
  exit 2
fi

echo "Target config: $GOINFRE_CONF"
echo "Target data-root: $GOINFRE_DATA"
echo
read -r -p "Proceed to configure Docker to use $GOINFRE_DATA as data-root? [y/N] " proceed
if [[ ! "$proceed" =~ ^[Yy]$ ]]; then
  echo "Aborted by user.";
  exit 0
fi

# Backup existing ~/.config/docker if present and not a symlink
if [ -e "$HOME_CONF" ] && [ ! -L "$HOME_CONF" ]; then
  backup="$HOME_CONF.bak.$(date +%Y%m%d%H%M%S)"
  echo "Backing up existing $HOME_CONF -> $backup"
  mv "$HOME_CONF" "$backup"
fi

mkdir -p "$GOINFRE_CONF" "$GOINFRE_DATA"

# Create symlink from $HOME_CONF to $GOINFRE_CONF if not already
if [ -L "$HOME_CONF" ]; then
  echo "$HOME_CONF is already a symlink -> $(readlink -f "$HOME_CONF")"
else
  if [ -e "$HOME_CONF" ]; then
    echo "Note: $HOME_CONF exists but is not a symlink (it was moved to a backup above)."
  fi
  ln -s "$GOINFRE_CONF" "$HOME_CONF"
  echo "Created symlink: $HOME_CONF -> $GOINFRE_CONF"
fi

# Write daemon.json (preserve existing if present)
DAEMON_JSON="$GOINFRE_CONF/daemon.json"
if [ -f "$DAEMON_JSON" ]; then
  echo "Found existing $DAEMON_JSON; contents:";
  sed -n '1,120p' "$DAEMON_JSON" || true
  echo
  read -r -p "Overwrite this daemon.json with new data-root? [y/N] " over
  if [[ ! "$over" =~ ^[Yy]$ ]]; then
    echo "Leaving existing daemon.json in place. Make sure it contains the desired data-root.";
  else
    cat > "$DAEMON_JSON" <<EOF
{
  "data-root": "$GOINFRE_DATA"
}
EOF
    echo "Wrote $DAEMON_JSON"
  fi
else
  cat > "$DAEMON_JSON" <<EOF
{
  "data-root": "$GOINFRE_DATA"
}
EOF
  echo "Wrote $DAEMON_JSON"
fi

# Ask whether to set storage-driver to vfs (useful on NFS mounts)
echo
read -r -p "Is $GOINFRE_ROOT an NFS-mounted path (y/N)? " is_nfs
if [[ "$is_nfs" =~ ^[Yy]$ ]]; then
  echo "Adding storage-driver: vfs to daemon.json (safer for NFS but slower)."
  tmp="$(mktemp)"
  jq '. + {"storage-driver":"vfs"}' "$DAEMON_JSON" > "$tmp" && mv "$tmp" "$DAEMON_JSON" || {
    # fallback if jq not installed
    cat > "$DAEMON_JSON" <<EOF
{
  "data-root": "$GOINFRE_DATA",
  "storage-driver": "vfs"
}
EOF
  }
  echo "Updated $DAEMON_JSON"
fi

# Show potential conflicting ExecStart flags
echo
echo "Checking systemd --user docker.service ExecStart (if present)..."
systemctl --user show --property=ExecStart docker.service || true
echo
read -r -p "Do you want to migrate existing Docker data from the current DockerRootDir to $GOINFRE_DATA now? [y/N] " do_migrate
if [[ "$do_migrate" =~ ^[Yy]$ ]]; then
  # Determine current DockerRootDir
  CURRENT=""
  if docker info &>/dev/null; then
    CURRENT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)
  else
    echo "Docker not running or docker client cannot talk to daemon. We'll attempt to read common locations.";
  fi

  if [ -z "$CURRENT" ]; then
    echo "Could not determine current DockerRootDir automatically. Please enter it (or press Enter to skip):"
    read -r CURRENT
  fi

  if [ -z "$CURRENT" ]; then
    echo "No source data-root provided; skipping migration.";
  else
    echo "About to migrate data from: $CURRENT -> $GOINFRE_DATA"
    read -r -p "Confirm and continue (this may take time and space) [y/N] " confirm_mig
    if [[ "$confirm_mig" =~ ^[Yy]$ ]]; then
      echo "Stopping rootless docker.service (user)..."
      systemctl --user stop docker.service || true

      echo "Starting rsync..."
      rsync -aHAX --numeric-ids --progress --exclude='overlay2/*' "$CURRENT/" "$GOINFRE_DATA/"
      echo "Rsync finished. Starting docker.service..."
      systemctl --user daemon-reload || true
      systemctl --user start docker.service || echo "warning: docker start failed" >&2
      echo "Migration finished. Verify with: docker info --format 'DockerRootDir: {{.DockerRootDir}}'"
    else
      echo "Migration cancelled by user.";
    fi
  fi
fi

echo
echo "Configuration steps completed. Reloading systemd user and restarting Docker (best-effort)."
systemctl --user daemon-reload || true
systemctl --user restart docker.service || echo "warning: restart failed; check 'journalctl --user -u docker.service'" >&2

echo
echo "Run the following to verify DockerRootDir and driver:"
echo "  docker info --format 'Driver: {{.Driver}}\nDockerRootDir: {{.DockerRootDir}}'"

echo "Done. If anything went wrong you can restore your original config from the backup(s) created earlier.";
