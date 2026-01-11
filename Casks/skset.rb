cask "skset" do
  version "0.8.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "ff962e74caa40f718965136e3213e16f2fff2c636f797bbbe84c7a366a23e625"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "a72fbb8452dbc0cba4bc54485432e56d5b7285bf6d6a5bee160ed4b10423f2c6"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "65f8a056d8245597dcdba0b64afc4a2e497e2f22a57af90b9bb07fe0385459ea"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "e67170ae90fb16a922651d02e1cdc312aff9d38c20e3e9c1db4d414cd2c6d027"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
