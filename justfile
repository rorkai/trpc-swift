# Task runner. Run `just --list` to see everything.

[private]
default:
    @just --list

# Install the JS dependencies needed to work in this repository
install:
    vp install --frozen-lockfile
    # The dev shell re-installs when the lockfile is newer than this stamp.
    touch node_modules/.install-stamp

# Bundle the CLI into dist/cli.mjs (cached by `vp run`, like check and test)
build:
    vp run build

# Build and publish to npm; CI passes --no-git-checks for its detached tag checkout
publish *args: build
    pnpm publish {{args}}

# Run the fixture tests (Swift compilation is skipped without Xcode)
test:
    vp run test

# Regenerate the committed fixture outputs
update-fixtures:
    vp test -u

# Format, lint and type-check through Vite+
check:
    vp run check

# Format the whole tree: Vite+ for JS/TS/JSON/Markdown/YAML, treefmt for the rest
fmt:
    vp check --fix
    nix fmt
