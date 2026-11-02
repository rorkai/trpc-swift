{
  lib,
  stdenv,
  stdenvNoCC,
  nodejs_24,
  pnpm,
  vp,
  fetchPnpmDeps,
  pnpmConfigHook,
  autoPatchelfHook,
  versionCheckHook,
}:
let
  packageJson = lib.importJSON ./package.json;
  mainProgram = builtins.head (builtins.attrNames packageJson.bin);

  src = lib.fileset.toSource {
    root = ./.;
    fileset = lib.fileset.unions [
      ./package.json
      ./pnpm-lock.yaml
      ./pnpm-workspace.yaml
      ./tsconfig.json
      ./vite.config.ts
      ./src
    ];
  };
in
stdenvNoCC.mkDerivation (finalAttrs: {
  pname = packageJson.name;
  inherit (packageJson) version;
  inherit src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 5;
    hash = "sha256-7X3WtjEDnJKpKQXOwf3LDbFQMsThRxdzAaVfrbL/d98=";
  };

  nativeBuildInputs = [
    nodejs_24
    pnpm
    pnpmConfigHook
    vp
  ]
  # The tsrs binary expects a glibc loader at /lib64.
  ++ lib.optionals stdenvNoCC.hostPlatform.isLinux [ autoPatchelfHook ];

  # nodejs is a host dependency so that fixupPhase points the bundle's
  # `#!/usr/bin/env node` shebang at it.
  buildInputs = [ nodejs_24 ] ++ lib.optionals stdenvNoCC.hostPlatform.isLinux [ stdenv.cc.cc.lib ];

  buildPhase = ''
    runHook preBuild

    # Without saved state under HOME, vp asks on its first run whether to
    # manage Node itself, and the sandbox has no terminal to answer. As in CI
    # it then stays in system-first mode and uses the Node from
    # nativeBuildInputs, downloading nothing.
    export HOME=$TMPDIR CI=1
    vp pack

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    packageDir=$out/lib/node_modules/${finalAttrs.pname}
    mkdir -p $packageDir $out/bin
    cp -r dist package.json $packageDir/

    # The bundle inlines every runtime dependency except tsrs, a peer that a
    # production install never adds for the root package. tsrs has no
    # dependencies of its own besides the binary for this platform, so both
    # are copied out of pnpm's store layout with their symlinks resolved.
    mkdir -p $packageDir/node_modules
    cp -rL node_modules/.pnpm/tsrs@${packageJson.devDependencies.tsrs}/node_modules/. $packageDir/node_modules/
    ln -s $packageDir/${packageJson.bin.${mainProgram}} $out/bin/${mainProgram}

    runHook postInstall
  '';

  doInstallCheck = true;
  nativeInstallCheckInputs = [ versionCheckHook ];

  meta = {
    inherit (packageJson) description homepage;
    inherit mainProgram;
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
      "aarch64-darwin"
    ];
  };
})
