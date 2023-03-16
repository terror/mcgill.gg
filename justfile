export RUST_LOG := 'info'

default:
  just --list

all: build test clippy fmt-check

build:
  cargo build

clippy:
  cargo clippy --all-targets --all-features

fmt:
  cargo fmt --all
  prettier --write .

fmt-check:
  cargo fmt --all -- --check
  @echo formatting check done

run *args:
  cargo run -- {{args}}

services:
  docker-compose up -d

test:
  cargo test

watch +COMMAND='test':
  cargo watch --clear --exec "{{COMMAND}}"
