cask "yerbapadre-bridge" do
  version "0.0.1"
  sha256 :no_check

  url "https://github.com/yerbapadre/bridge/releases/download/v#{version}/Bridge_#{version}_aarch64.dmg"
  name "Bridge"
  desc "Task management for parallel work streams"
  homepage "https://github.com/yerbapadre/bridge"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Bridge.app"

  zap trash: [
    "~/Library/Application Support/com.bridge.app",
    "~/Library/Caches/com.bridge.app",
    "~/Library/Preferences/com.bridge.app.plist",
    "~/Library/Saved Application State/com.bridge.app.savedState",
  ]
end
