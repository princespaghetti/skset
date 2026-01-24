cask "skset" do
  version "0.9.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "36858d344ae0b09b78e1d7809cf691135e978f60e7827c8865c34539fccfb549"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "51e12a33b1543fa150bcd75793f1559c2549330c7b17dc6d0566396efb6ab7ef"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "12f305088ed1d0d89c2a601f5fbabb277a63da81ddbfc6ae1e77cd5b7c1f2ebb"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "3b7c927568068796e6bdacea6234b0aa3109705f76835e26def86a72f0a939f6"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
