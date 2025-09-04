{
  description = "Dev environment for JavaScript npm library";

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
          ];

          shellHook = ''
            echo "Dev shell ready:"
            echo "  node --version -> $(node --version)"
            echo "  npm --version  -> $(npm --version)"
          '';
        };
      });
}

