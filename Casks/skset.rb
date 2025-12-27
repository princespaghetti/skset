cask "skset" do
  version "0.1.3"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "e934abb4f2ec5f3290750664416fa023915191e26d490a1440b3270572a52854"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "0178bcd44bbab3a95226103f936b9cb7ae01ac7f14febe717fe68e02aba17190"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "9d2efa3e6d419ba89ca215668bebcdca8af845c67d659fbbb665d38e1117528f"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "11d4dac92527967e7a75e1ab538fff6af6b09ea9064cae516ab64459b7b824bf"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
