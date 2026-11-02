_: {
  perSystem =
    { config, pkgs, ... }:
    let
      trpc-swift = pkgs.callPackage ../package.nix { inherit (config.packages) pnpm vp; };
    in
    {
      packages = {
        inherit trpc-swift;
        default = trpc-swift;
      };

      apps.default = {
        type = "app";
        program = pkgs.lib.getExe trpc-swift;
      };

      checks.build = trpc-swift;
    };
}
