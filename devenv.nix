{ pkgs, lib, config, inputs, ... }:

{
  packages = with pkgs; [
    caddy
    curl
    docker
    git
    gomod2nix
    gopls
  ];

  dotenv.enable = true;

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    npm = {
      enable = true;
      install.enable = false;
    };
  };

  languages.typescript = {
    enable = true;
  };

  languages.go.enable = true;
  languages.go.version = "1.26.5";

  process.manager.implementation = "process-compose";

  processes = {
    daggerlore-web = {
      exec = "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort";
      env = {
        DAGGERLORE_DEV_GATEWAY = "true";
        PORT = "5173";
      };
      ready.exec = "curl -fsS http://127.0.0.1:5173 >/dev/null";
    };

    daggerlore-api = {
      exec = "go run ./cmd/server.go";
      ready.exec = "curl -fsS http://127.0.0.1:3000/liveness >/dev/null";
    };

    daggerlore-gateway = {
      exec = "caddy run --config Caddyfile --adapter caddyfile";
      after = [
        "devenv:processes:daggerlore-web"
        "devenv:processes:daggerlore-api"
      ];
      env = {
        PORT = "8080";
        DAGGERLORE_API_UPSTREAM = "127.0.0.1:3000";
        DAGGERLORE_WEB_UPSTREAM = "127.0.0.1:5173";
      };
      ready.exec = "curl -fsS http://127.0.0.1:8080 >/dev/null";
    };
  };

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
    go version
    echo "node version $(node --version)"
    echo "npm version $(npm --version)"
  '';

  enterTest = ''
    echo "Running tests"
    git --version | grep --color=auto "${pkgs.git.version}"
  '';
}
