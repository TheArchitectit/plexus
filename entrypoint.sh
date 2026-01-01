#!/bin/bash
set -e

ARCH=$(uname -m)
echo "Detected architecture: $ARCH"

if [ "$ARCH" = "x86_64" ]; then
  if [ -f "./plexus-linux-amd64" ]; then
    echo "Starting Plexus (AMD64)..."
    exec ./plexus-linux-amd64
  else
    echo "Error: plexus-linux-amd64 not found."
    exit 1
  fi
elif [ "$ARCH" = "aarch64" ]; then
  if [ -f "./plexus-linux-arm64" ]; then
    echo "Starting Plexus (ARM64)..."
    exec ./plexus-linux-arm64
  else
    echo "Error: plexus-linux-arm64 not found."
    exit 1
  fi
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi
