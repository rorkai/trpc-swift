# Task runner. Run `just --list` to see everything.

[private]
default:
    @just --list

# Install the JS dependencies needed to work in this repository
install:
    pnpm install --frozen-lockfile
    # The dev shell re-installs when the lockfile is newer than this stamp.
    touch node_modules/.install-stamp

# Run the fixture tests (Swift compilation is skipped without Xcode)
test:
    pnpm test

# Regenerate the committed fixture outputs
update-fixtures:
    vp test -u

# Format, lint and type-check through Vite+
check:
    vp check

# Format the whole tree: Vite+ for JS/TS/JSON/Markdown/YAML, treefmt for the rest
fmt:
    vp check --fix
    nix fmt
