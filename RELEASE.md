# Release Process

## Creating a New Release

1. **Update version** in `package.json` and `Casks/skset.rb`

2. **Commit version bump:**
   ```bash
   git add package.json Casks/skset.rb
   git commit -m "Bump version to x.y.z"
   ```

3. **Create and push tag:**
   ```bash
   git tag vx.y.z
   git push origin main
   git push origin vx.y.z
   ```

4. **GitHub Actions will automatically:**
   - Run tests
   - Build binaries for 4 platforms (macOS arm64/x64, Linux arm64/x64)
   - Create GitHub release with binaries and checksums

## Updating Homebrew Cask SHA256 Checksums

After the first release, you need to update the SHA256 checksums in `Casks/skset.rb`:

1. **Download the checksums file from the release:**
   ```bash
   curl -L https://github.com/princespaghetti/skset/releases/download/vx.y.z/checksums.txt
   ```

2. **Update `Casks/skset.rb`** with the SHA256 values for each platform:
   - `skset-darwin-arm64.tar.gz` → macOS ARM
   - `skset-darwin-x64.tar.gz` → macOS Intel
   - `skset-linux-x64.tar.gz` → Linux Intel
   - `skset-linux-arm64.tar.gz` → Linux ARM

3. **Commit the updated Cask:**
   ```bash
   git add Casks/skset.rb
   git commit -m "Update Cask checksums for vx.y.z"
   git push origin main
   ```

## Installation After Release

Users can install via Homebrew:

```bash
brew tap princespaghetti/skset https://github.com/princespaghetti/skset
brew install skset
```

## Testing a Release Locally

To test binaries before releasing:

```bash
# Build for your platform
bun run build

# Test the binary
./dist/skset --version
./dist/skset init
```
