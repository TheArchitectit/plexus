#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE USER plexus WITH PASSWORD 'plexus';
    CREATE DATABASE plexus;
    GRANT ALL PRIVILEGES ON DATABASE plexus TO plexus;
EOSQL
