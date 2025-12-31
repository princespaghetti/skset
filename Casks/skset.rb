cask "skset" do
  version "0.5.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "52be1b346c48f9e1d0d352c4a4c7a6d2f28c7bb9f0a27f343ec4e64bf886a04c"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "057a944e3f29d32cbf6ddc2591beddcfd967bc19d14350e2971008ad53b3dfbe"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "deb034be03418b4c8ce77c380705df11f996f543193329ce8a660311ced1fc0c"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "0c2a6154ff22c6971fc506378e9cb8a642a34552753166964864d8cd373fa888"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
