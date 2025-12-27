cask "skset" do
  version "0.2.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "012a0a6436bbd4bfe5687c8282c973c824a2bb1678b656be3adf33dbf53cf295"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "a87c8aaeed8557e4c44bc841291808b2c0362330c47a627fa59b8241204b9fce"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "9c446d8ae8f6382d2e89e4b0fe873ed332e9e812f5bd68c93db60ad63f175e6d"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "fc59403d485fce34b7319bb6cbef48acd31549144ac4aedc1a033d8a11913b9f"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
