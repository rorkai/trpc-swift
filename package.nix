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
      ./config-schema.json
      ./tsconfig.json
      ./vite.config.ts
      ./src
    ];
  };
in
stdenvNoCC.mkDerivation (finalAttrs: {
  # A store path name cannot hold the npm scope's slash.
  pname = lib.last (lib.splitString "/" packageJson.name);
  inherit (packageJson) version;
  inherit src;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 5;
    hash = "sha256-hlyYD8YSpqcVqx2cuKM6TEa2f1YEiJKmk4M2YhPctGY=";
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
    # nativeBuildInputs, downloading nothing. HOME changes for vp alone, since
    # pnpmConfigHook keeps its offline store setting in the original HOME.
    HOME=$TMPDIR CI=1 vp pack

    # The runtime install is the production dependencies plus tsrs, a peer that
    # a production install never adds for the root package. tsrs has no
    # dependencies besides the binary for this platform, so both are copied out
    # of the full install with their symlinks resolved before it is replaced.
    tsrsDir=$TMPDIR/tsrs
    mkdir -p $tsrsDir
    cp -rL node_modules/.pnpm/tsrs@${packageJson.devDependencies.tsrs}/node_modules/. $tsrsDir/
    rm -rf node_modules
    pnpm install --offline --prod --frozen-lockfile --ignore-scripts
    cp -r $tsrsDir/. node_modules/

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

    packageDir=$out/lib/node_modules/${packageJson.name}
    mkdir -p $packageDir $out/bin
    cp -r dist node_modules package.json config-schema.json $packageDir/
    ln -s $packageDir/${packageJson.bin.${mainProgram}} $out/bin/${mainProgram}

    runHook postInstall
  '';

  doInstallCheck = true;
  nativeInstallCheckInputs = [ versionCheckHook ];

  meta = {
    inherit (packageJson) description homepage;
    license = lib.getLicenseFromSpdxId packageJson.license;
    inherit mainProgram;
    platforms = [
      "x86_64-linux"
      "aarch64-linux"
      "aarch64-darwin"
    ];
  };
})
