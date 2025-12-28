cask "skset" do
  version "0.4.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "97fef7edaa718cc5c15b0e95e9205649ff4b12366f440963666fd6c86f4aaaa8"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "2a83112e1efae1745e43e7c4775d383b9a57851a4e4f3e9f48cb5862475b16c1"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "7dad615dc109dce085cd2d45895e1c8a4a04b636ec82fb5f64c42f007b7a583a"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "5f068b83eb5643cb0792b1c6a5befbf57e2833dd7c87b42b4ff7c7897d66711c"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
