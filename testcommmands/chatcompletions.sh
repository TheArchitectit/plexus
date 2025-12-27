#!/bin/bash

# Change to the directory containing this script
cd "$(dirname "$0")"

# Check if the JSON body file exists
if [ ! -f "testwithtool.json" ]; then
    echo "Error: testwithtool.json not found in testcommmands directory"
    exit 1
fi

curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d @testwithtool.json