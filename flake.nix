{
  description = "Dev environment for ClojureScript npm library with shadow-cljs";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = [
            # Node.js 22.17.0 (with npm 10.9.2 bundled)
            pkgs.nodejs_22

            # Java JDK 21 (latest LTS, required for shadow-cljs)
            pkgs.jdk21
          ];

          shellHook = ''
            echo "Dev shell ready:"
            echo "  node --version -> $(node --version)"
            echo "  npm --version  -> $(npm --version)"
            echo "  java --version -> $(java --version | head -n1)"
          '';
        };
      });
}

