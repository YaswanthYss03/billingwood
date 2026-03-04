# PDF Generation Fix for Render Deployment

## Problem
The PDF generation was failing on Render with a 500 error because the regular `puppeteer` package requires Chromium and many system dependencies that aren't available in Render's environment.

## Solution
We've switched to `@sparticuz/chromium` with `puppeteer-core`, which is optimized for serverless/cloud platforms.

## Changes Made

### 1. Package Dependencies Updated
**File:** `package.json`

Replaced:
```json
"puppeteer": "^24.37.5"
```

With:
```json
"@sparticuz/chromium": "^131.0.2",
"puppeteer-core": "^24.37.5"
```

### 2. PDF Service Updated
**File:** `src/invoices/services/invoice-pdf.service.ts`

- Updated imports to use `puppeteer-core` and `@sparticuz/chromium`
- Modified browser launch configuration to use chromium executable in production
- Added environment-aware configuration (production vs development)

### 3. Render Configuration Updated
**File:** `render.yaml`

Added environment variable:
```yaml
- key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
  value: true
```

## Deployment Steps

### 1. Install New Dependencies
```bash
cd SaaS_Platform_POS
npm install
```

This will install:
- `@sparticuz/chromium` - Optimized Chromium for serverless
- `puppeteer-core` - Lightweight Puppeteer without bundled Chromium

### 2. Test Locally (Optional)
For local testing, the code will use your system's Chromium:
```bash
npm run start:dev
```

If you get an error about missing Chromium executable, install it:

**On Ubuntu/Debian:**
```bash
sudo apt-get install chromium-browser
```

**On macOS:**
```bash
brew install chromium
```

**Or set the path manually:**
```bash
export PUPPETEER_EXECUTABLE_PATH=/path/to/chromium
```

### 3. Commit and Push Changes
```bash
git add package.json package-lock.json src/invoices/services/invoice-pdf.service.ts render.yaml
git commit -m "Fix PDF generation for Render deployment using @sparticuz/chromium"
git push
```

### 4. Deploy to Render
Render will automatically:
1. Detect the changes
2. Install `@sparticuz/chromium` (skipping regular Chromium download)
3. Use the serverless-optimized Chromium for PDF generation

### 5. Verify the Fix
Once deployed, test PDF generation:
1. Go to your app: `https://billingwoodserver.onrender.com`
2. Navigate to Invoices
3. Click "Preview PDF" or "Download PDF" on any invoice
4. PDF should generate successfully

## Technical Details

### How It Works

**In Production (Render/Vercel/AWS):**
- Uses `@sparticuz/chromium` which provides a pre-built, optimized Chromium binary (~50MB compressed)
- Automatically downloads and extracts the binary at runtime
- Includes all necessary dependencies
- Optimized for serverless environments

**In Development (Local):**
- Falls back to system Chromium
- Checks `PUPPETEER_EXECUTABLE_PATH` environment variable
- Default path: `/usr/bin/chromium-browser`

### Browser Launch Configuration
```typescript
const browser = await puppeteer.launch({
  args: isProduction 
    ? chromium.args  // Optimized args for serverless
    : ['--no-sandbox', '--disable-setuid-sandbox'],
  defaultViewport: chromium.defaultViewport,
  executablePath: isProduction 
    ? await chromium.executablePath()  // Serverless chromium
    : process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
  headless: chromium.headless,
});
```

## Troubleshooting

### Error: "Failed to launch browser"
- Check Render logs for specific error
- Ensure `NODE_ENV=production` is set in Render
- Verify `@sparticuz/chromium` is installed (check build logs)

### Error: "Cannot find module '@sparticuz/chromium'"
Run:
```bash
npm install
```

### PDFs Still Not Generating
1. Check Render logs for errors
2. Verify environment variables are set
3. Check if Render plan has enough memory (free tier = 512MB, may need upgrade for heavy PDF generation)

### Large PDF Files Timing Out
Consider:
- Upgrading Render plan for more resources
- Implementing PDF generation queue/background jobs
- Caching generated PDFs

## Memory Considerations

**Render Free Tier:** 512MB RAM
- Should handle basic PDF generation
- May struggle with complex invoices or multiple concurrent requests

**Recommended for Production:** Starter plan (1GB RAM) or higher

## Alternative Solutions (If Issues Persist)

1. **Use external PDF service:**
   - PDFMonkey
   - DocRaptor
   - Cloudmersive

2. **Use client-side PDF generation:**
   - jsPDF + html2canvas (frontend)
   - Trade-off: Less server load, but client-side limitations

3. **Queue-based PDF generation:**
   - Use BullMQ/Redis for background jobs
   - Generate PDFs asynchronously
   - Store in Supabase Storage

## References
- [@sparticuz/chromium Documentation](https://github.com/Sparticuz/chromium)
- [Puppeteer Core Documentation](https://pptr.dev/)
- [Render Deployment Guide](https://render.com/docs)
