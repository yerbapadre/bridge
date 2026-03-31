# Bridge Landing Page

Simple landing page for the Bridge desktop app with download links.

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment to Cloudflare Pages

### Initial Setup

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Connect your GitHub repository
3. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `pnpm build`
   - **Build output directory**: `dist`
   - **Root directory**: `website`

### Automatic Deployment

Once connected, Cloudflare Pages will automatically deploy:
- Every push to `main` → Production
- Every pull request → Preview deployment

### Manual Deployment

```bash
# Install Wrangler CLI
pnpm add -g wrangler

# Deploy
cd website
pnpm build
npx wrangler pages deploy dist
```

## Setting Up Downloads

### Option 1: GitHub Releases (Recommended)

1. Build your app:
   ```bash
   cd .. # back to root
   pnpm run tauri build
   ```

2. Create a GitHub release and upload the installers from:
   - macOS: `src-tauri/target/release/bundle/dmg/Bridge_*.dmg`
   - Windows: `src-tauri/target/release/bundle/msi/Bridge_*_x64.msi` or `nsis/Bridge_*_x64-setup.exe`
   - Linux: `src-tauri/target/release/bundle/appimage/Bridge_*_amd64.AppImage`

3. Update download URLs in `src/App.tsx`:
   ```typescript
   const DOWNLOAD_URLS = {
     mac: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_universal.dmg',
     windows: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_x64_setup.exe',
     linux: 'https://github.com/YOUR_USERNAME/bridge/releases/latest/download/Bridge_amd64.AppImage'
   }
   ```

### Option 2: Cloudflare R2

1. Create an R2 bucket in Cloudflare
2. Upload your installers
3. Configure public access or signed URLs
4. Update URLs in `src/App.tsx`

## Customization

- Update GitHub links in `src/App.tsx` (replace `YOUR_USERNAME`)
- Modify features list
- Change colors in Tailwind classes
- Add screenshots or demo video

## Custom Domain

In Cloudflare Pages:
1. Go to your project → Custom domains
2. Add your domain
3. Update DNS records as instructed
