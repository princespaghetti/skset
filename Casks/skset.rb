cask "skset" do
  version "0.2.1"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "ab9c32bd3bb02e41fd08eba680058dce808887e36f8425b6aab25ed2403e0700"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "e4159033692a38ea26dae246969f7ee76c93d8030b0ac6631955ffbbbedb2bdf"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "75dc1df2e1bc50d43f87146bc877668c0788ee8c7d96aaf0853eb44943cc5871"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "59b8cf5d3cc010f209353f15366957e77bf7d672495f23a68bfc17d900787550"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
