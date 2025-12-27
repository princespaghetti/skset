cask "skset" do
  version "0.1.4"
  desc "LLM Skill Manager CLI"
  homepage "https://github.com/princespaghetti/skset"

  on_macos do
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-arm64.tar.gz"
      sha256 "78b73233d115558d1b81c9af1322fcd136bcc1aa3012d6343ee58aeae4a07fb8"
    end
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-darwin-x64.tar.gz"
      sha256 "c92dbe262f921273be711fdf36c898958868b3b9e7c9aca09917df7c902fb0a2"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-x64.tar.gz"
      sha256 "97a7cea459785de956520575ef218cf0a5649c93f9eb6eaece9e9efa6a1d9114"
    end
    on_arm do
      url "https://github.com/princespaghetti/skset/releases/download/v#{version}/skset-linux-arm64.tar.gz"
      sha256 "c14a397a32f37b94e34d6ca0adc835b31c2753d60c51b84d16fe7e50f3fadd87"
    end
  end

  binary "skset"

  postflight do
    system_command "/usr/bin/xattr", args: ["-dr", "com.apple.quarantine", "#{staged_path}/skset"] if OS.mac?
  end
end
