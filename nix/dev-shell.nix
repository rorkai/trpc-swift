{ lib, ... }:
{
  perSystem =
    { config, pkgs, ... }:
    {
      # No C toolchain: the Darwin stdenv would point DEVELOPER_DIR at a Nix SDK
      # without the iOS platform, and the Swift fixture tests need Xcode's.
      devShells.default = pkgs.mkShellNoCC {
        buildInputs =
          (with pkgs; [
            nodejs_24
            config.packages.pnpm
            config.packages.vp
            config.treefmt.build.wrapper
            nixfmt
            deadnix
            statix
            typos
            typos-lsp
            oxfmt
            oxlint
            actionlint
            zizmor
            just
            prek
            gitleaks
            jq
            git
            gh
            ast-grep
            ripgrep
            fd
          ])
          ++ config.pre-commit.settings.enabledPackages;

        shellHook = ''
          # Install whenever the lockfile is newer than the last `just install`,
          # so a `git pull` that bumps dependencies does not leave a stale tree.
          if [ ! -e node_modules/.install-stamp ] || [ pnpm-lock.yaml -nt node_modules/.install-stamp ]; then
            echo "Installing dependencies..."
            just install
          fi

          ${config.pre-commit.shellHook}

          # Hooks are shared across worktrees, but the config symlink only exists
          # where this shell has loaded; git-hooks.nix cannot pass this flag.
          for stage in ${lib.escapeShellArgs config.pre-commit.settings.installStages}; do
            hookFile=$(${lib.getExe config.pre-commit.settings.gitPackage} rev-parse --path-format=absolute --git-path "hooks/$stage")
            if ! grep -q -- --skip-on-missing-config "$hookFile" 2>/dev/null; then
              ${lib.getExe config.pre-commit.settings.package} install \
                -c ${config.pre-commit.settings.configPath} -t "$stage" --allow-missing-config >/dev/null
            fi
          done
        '';
      };
    };
}
