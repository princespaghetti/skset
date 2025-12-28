cask "skset" do
  version "0.3.0"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "87438bde518ff92345d1891c8ae90dc6e2715f576565dd541677ba563f76fe61"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "e83695827e17240b1450532758716ad6ee63ee7f5f8b5cfa485ef9ab89a5f873"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "b598e5bb59bd9bec42624dc3e03d52796dc2d6c647a58ace1d201619b8f41c2d"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "1db5f3f5a3f9bd4e11621a8e14068dc45c1295d9ffad96974e8cbee87d65c468"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
