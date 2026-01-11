cask "skset" do
  version "0.6.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "a684b44c6cc656d412574f02d4ab9bed3d71e2246d69195a2a687cf0b1c52aa6"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "ebd885770f1e0a647116b1e93ab6bea7d0b11c4fd57a341c2220231d736f83ce"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "9fbeab3a74644d8e2f785957c811d9564a3a52298301c4c3228926459d956ad1"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "92810eb6b7f8ce72962d35f744e25b9c82753d5565126c67b27e655decb62e5f"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
