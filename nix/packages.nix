_: {
  perSystem =
    { config, pkgs, ... }:
    let
      trpc-to-swift = pkgs.callPackage ../package.nix { inherit (config.packages) pnpm vp; };
    in
    {
      packages = {
        inherit trpc-to-swift;
        default = trpc-to-swift;
      };

      apps.default = {
        type = "app";
        program = pkgs.lib.getExe trpc-to-swift;
      };

      checks.build = trpc-to-swift;
    };
}
