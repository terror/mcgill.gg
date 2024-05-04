set dotenv-load

export RUST_LOG := 'info'

alias a := all
alias d := dev
alias f := fmt
alias i := initialize
alias t := test

default:
  just --list

all: build clippy e2e fmt-check forbid lint test

build *mode='development':
  cargo build && pnpm run build -- --mode {{mode}}

build-container:
  docker build -t mcgill.courses:latest .

clippy:
  ./bin/clippy

coverage:
  ./bin/coverage

dev: services
  concurrently \
    --kill-others \
    --names 'SERVER,CLIENT' \
    --prefix-colors 'green.bold,magenta.bold' \
    --prefix '[{name}] ' \
    --prefix-length 2 \
    --success first \
    --handle-input \
    --timestamp-format 'HH:mm:ss' \
    --color \
    -- \
    'just watch run serve --db-name=mcgill-courses' \
    'pnpm run dev'

dev-deps:
  cargo install present typeshare-cli

e2e:
  pnpm run cy:e2e

fmt:
  cargo fmt --all
  pnpm run format

fmt-check:
  cargo fmt --all -- --check
  pnpm run format-check

forbid:
  ./bin/forbid

gen-types:
  ./bin/typeshare

initialize *args: restart-services
  cargo run -- --source=seed serve --initialize --db-name=mcgill-courses {{args}}

lint *args:
  pnpm run lint {{args}}

load:
  cargo run -- --source=seed \
    load \
    --batch-size=200 \
    --scrape-vsb \
    --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36"

readme:
  present --in-place README.md
  @prettier --write README.md

restart-services:
  docker compose down --volumes && just services

run *args:
  cargo run -- {{args}}

run-container: build-container
  docker run -d \
    -e MONGODB_URL=$MONGODB_URL \
    -e MS_CLIENT_ID=$MS_CLIENT_ID \
    -e MS_CLIENT_SECRET=$MS_CLIENT_SECRET \
    -e MS_REDIRECT_URI=$MS_REDIRECT_URI \
    -e RUST_LOG=info \
    -p 8000:8000 \
    mcgill.courses:latest

serve:
  cargo run -- serve --db-name=mcgill-courses

services:
  docker compose up --no-recreate -d
  sleep 5
  docker exec mongodb mongosh --quiet --eval 'rs.initiate()' > /dev/null 2>&1 || true

test *filter:
  cargo test --all {{filter}}

watch +COMMAND='test':
  cargo watch --clear --exec "{{COMMAND}}"
