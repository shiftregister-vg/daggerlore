#!/usr/bin/env bash

set -ex

echo "Running API tests..."
go test -v ./...
