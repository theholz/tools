#!/bin/sh
response=$(wget --spider -S "http://localhost:3000/health" 2>&1 | grep "HTTP/" | awk '{print $2}')
if [ "$response" = "200" ]; then
  exit 0
else
  exit 1
fi
