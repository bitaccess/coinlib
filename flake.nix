{
  description = "This Nix flake creates a development shell for Coinlib that provides the
  required versions of dependencies such as NodeJS 14 and npm 6";
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-nodejs-14.url = "github:nixos/nixpkgs/72bbea9db7d727ed044e60b5f5febc60a3c5c955";
    nixpkgs-lerna-4.url = "github:nixos/nixpkgs/41cc1d5d9584103be4108c1815c350e07c807036";
  };

  outputs = { flake-utils, nixpkgs, nixpkgs-nodejs-14, nixpkgs-lerna-4, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        pkgs-nodejs-14 = nixpkgs-nodejs-14.legacyPackages.${system};
        pkgs-lerna-4 = nixpkgs-lerna-4.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            pkgs.autoconf
            pkgs.automake
            pkgs.gcc
            pkgs.libtool
            pkgs-nodejs-14.nodejs-14_x
            pkgs-lerna-4.nodePackages.lerna
            pkgs.python310
          ];
          shellHook = ''
            # if .env exists, then source it
            if [ -f .env ]; then
              echo ".env file found, sourcing file"
              source .env
            else
              echo "========= No .env file found ========="
            fi
          '';
        };
      });
}
