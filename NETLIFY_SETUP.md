# Netlify Functions Setup Guide

## Environment Variables

In Netlify Dashboard → Site Settings → Environment Variables, add:

- **Key**: `ANTHROPIC_API_KEY`
- **Value**: Your Anthropic API key (DO NOT use VITE_ prefix)
- **Scopes**: All scopes (Production, Deploy Previews, Branch Deploys)

## Installing Netlify Functions Dependencies

Netlify Functions need the Anthropic SDK. The package.json has `@anthropic-ai/sdk` in devDependencies, but Netlify Functions run in a separate environment.

### Option 1: Add to dependencies (Recommended for Netlify)
Move `@anthropic-ai/sdk` from devDependencies to dependencies, OR install it in the functions directory.

### Option 2: Install in netlify/functions directory
Create a `package.json` in `netlify/functions/`:

```json
{
  "name": "netlify-functions",
  "version": "1.0.0",
  "dependencies": {
    "@anthropic-ai/sdk": "^0.71.2"
  }
}
```

Then run `npm install` in that directory.

## Testing Locally

Install Netlify CLI:
```bash
npm install -g netlify-cli
```

Run locally:
```bash
netlify dev
```

This will:
- Start the Vite dev server
- Start Netlify Functions locally
- Use environment variables from `.env` file or Netlify config

## Deployment

1. Push code to GitHub
2. Netlify will automatically build and deploy
3. Functions will be available at `/.netlify/functions/generate-lesson-plan` and `/.netlify/functions/refine-lesson-plan`
4. Make sure `ANTHROPIC_API_KEY` is set in Netlify environment variables

## Troubleshooting

If functions fail:
1. Check Netlify Function logs in Dashboard → Functions
2. Verify `ANTHROPIC_API_KEY` is set correctly
3. Check that `@anthropic-ai/sdk` is available (may need to be in dependencies, not just devDependencies)
4. Verify function code syntax is correct

