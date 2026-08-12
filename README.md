# Coffee Recipe Builder

AI-powered brewing recipes using Claude. Enter coffee details or paste a product URL, select your grinder and brew method, and get a World Barista Champion-level recipe.

## Features

- **URL Import**: Paste a coffee product link to auto-extract origin, variety, process, roast level, and tasting notes
- **Grinder Library**: Fellows Ode, Baratza, Comandante, Timemore, 1Zpresso, Eureka, Niche, Weber
- **Brew Methods**: Pour Over (Kalita, V60, Chemex, Origami, etc.), Immersion, Espresso, Cold Brew
- **Smart Recipes**: Optimized for coffee characteristics (elevation, process, variety, roast level)

## Deploy to Vercel

### Option 1: Deploy with Git

1. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/coffee-recipe-builder.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign in

3. Click "Add New Project" and import your GitHub repository

4. Add your environment variable:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your API key from [console.anthropic.com](https://console.anthropic.com/)

5. Click "Deploy"

### Option 2: Deploy with Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Add your API key:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```

4. Redeploy to apply the environment variable:
   ```bash
   vercel --prod
   ```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` with your API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Claude API (model set in app/lib/ai-config.js — currently claude-sonnet-4-6)
- Vercel for hosting
