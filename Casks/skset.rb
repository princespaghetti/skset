cask "skset" do
  version "0.1.2"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "5cf6d12edfd26842703d9f262bd4a16be0510f9f82cb2ec49459ef4d5b724a3f"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "b75cd372da6481e36a3397c661d00b9d1fb30d3165b621761a0b7cc05da0dc7e"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "d326a66de9a93e873948b5852a1852b419c261bd9f63de036a23f284cd2d808d"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "b6fccf80d41aac2c57292fd850a8e57454003d19d321d7f4d5fafa7942c97079"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
