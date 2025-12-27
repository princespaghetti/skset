# Release Process

## Creating a New Release

1. **Create and push tag:**
   ```bash
   git tag vx.y.z
   git push origin vx.y.z
   ```

2. **GitHub Actions will automatically:**
   - Run tests
   - Build binaries for 4 platforms (macOS arm64/x64, Linux arm64/x64)
   - Create GitHub release with binaries and checksums
   - Update `Casks/skset.rb` with new version and SHA256 checksums
   - Update `package.json` with new version
   - Commit changes back to main branch

That's it! No manual version updates needed.

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
