#!/usr/bin/env bash
set -euo pipefail

# Ensure network exists and attach Postgres container
docker network create odoo-net || true

if docker ps --format '{{.Names}}' | grep -q '^db_odoo$'; then
  docker network connect odoo-net db_odoo || true || echo "db_odoo could not be connected"
else
  echo "db_odoo container not found; skipping network connect"
fi

# Create DB user and DB (passwordless mode)
DB_USER=${1:-odoo19}
DB_NAME=${2:-odoo19}

if docker ps --format '{{.Names}}' | grep -q '^db_odoo$'; then
  USER_EXISTS=$(docker exec -i db_odoo psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'") || true
  if [ "${USER_EXISTS}" != "1" ]; then
    echo "Creating user ${DB_USER}..."
    docker exec -i db_odoo psql -U postgres -c "CREATE USER ${DB_USER};" || true
  else
    echo "User ${DB_USER} already exists"
  fi

  DB_EXISTS=$(docker exec -i db_odoo psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'") || true
  if [ "${DB_EXISTS}" != "1" ]; then
    echo "Creating database ${DB_NAME}..."
    docker exec -i db_odoo psql -U postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" || true
  else
    echo "Database ${DB_NAME} already exists"
  fi
else
  echo "db_odoo not found, cannot create DB/user"
fi

# Bring up the application
cd ~/odoo19 || true

# Ensure host directories are writable by the current user (prevents permission churn)
# when this script is run on the VM as the deploy user this keeps ownership consistent.
chown -R "$(id -u):$(id -g)" ./filestore ./config ./addons || true

docker compose pull || true
docker compose up -d --build || true

echo "Deployment script finished"
