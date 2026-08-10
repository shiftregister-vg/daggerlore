{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    git
    gomod2nix
    gopls
  ];

  dotenv.enable = true;

  languages.javascript = {
    enable = true;
    npm = {
      enable = true;
      install.enable = true;
    };
  };

  languages.typescript = {
    enable = true;
  };

  languages.go.enable = true;
  languages.go.version = "1.26.5";

  git-hooks.hooks = {
    govet = {
      enable = true;
      pass_filenames = false;
    };

    gotest.enable = true;
    golangci-lint = {
      enable = true;
      pass_filenames = false;
    };
  };

  outputs = 
    let
      name = "daggerlore-api";
      version = "1.0.0";
    in
    { app = import ./default.nix { inherit pkgs name version; }; };

  scripts.hello.exec = ''
    echo hello from Daggerlore
  '';

  enterShell = ''
    hello         # Run scripts directly
    git --version # Use packages
  '';

  enterTest = ''
    echo "Running tests"
    git --version | grep --color=auto "${pkgs.git.version}"
  '';
}
