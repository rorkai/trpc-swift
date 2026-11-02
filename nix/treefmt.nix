{ lib, ... }:
let
  root = ./..;
in
{
  perSystem =
    { pkgs, ... }:
    {
      treefmt = {
        inherit pkgs;
        projectRoot = root;
        projectRootFile = "flake.nix";

        programs = {
          deadnix.enable = true;
          nixfmt.enable = true;
          statix.enable = true;
          typos = {
            enable = true;
            configFile = "./typos.toml";
          };
        };

        # The fixture outputs are golden files that the tests compare byte for byte.
        settings.global.excludes = [ "tests/*/Output.swift" ];

        settings.formatter = {
          deadnix.priority = 1;
          statix.priority = 2;
          nixfmt.priority = 3;
          oxfmt = {
            command = lib.getExe pkgs.oxfmt;
            options = [ "--no-error-on-unmatched-pattern" ];
            includes = [ "*" ];
            priority = 4;
          };
          actionlint = {
            command = lib.getExe pkgs.actionlint;
            includes = [
              ".github/workflows/*.yaml"
              ".github/workflows/*.yml"
            ];
            priority = 5;
          };
          zizmor = {
            command = lib.getExe pkgs.zizmor;
            options = [
              "--offline"
              "--min-severity"
              "high"
              "--min-confidence"
              "high"
            ];
            includes = [
              ".github/workflows/*.yaml"
              ".github/workflows/*.yml"
            ];
            priority = 6;
          };
          oxlint = {
            command = lib.getExe pkgs.oxlint;
            options = [
              "--fix"
              # A batch can consist entirely of ignored paths, which oxlint treats as an error.
              "--no-error-on-unmatched-pattern"
            ];
            includes = [
              "*.js"
              "*.mjs"
              "*.ts"
            ];
            priority = 7;
          };
        };
      };
    };
}
