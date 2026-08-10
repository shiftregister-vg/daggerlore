{ pkgs, name, version, ... }:
pkgs.buildGoApplication {
  pname = name;
  version = version;

  src = builtins.path {
    path = ./api/.;
    name = "source";
  };

  ## remember to call 'gomod2nix' to generate this file
  modules = ./api/gomod2nix.toml;
}
