# Connecting tāst to Supabase (accounts & cloud sync)

The app works fully **without** this — recipes and settings save on your device.
Do these steps to switch on accounts, cross-device sync, and brew history.

## 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → name it (e.g. `tast`), set a database password, pick a region, **Create**.
3. Wait ~2 minutes for it to finish provisioning.

## 2. Create the tables

1. In your project: **SQL Editor → New query**.
2. Open `supabase/schema.sql` from this repo, copy all of it, paste it in, and click **Run**.
3. You should see “Success.” (This also turns on row-level security so each user only sees their own data.)

## 3. Turn on magic-link email sign-in

1. **Authentication → Providers → Email**: make sure **Email** is enabled (it is by default). Magic links work out of the box.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (for local dev).
   - **Redirect URLs**: add `http://localhost:3000` and, later, your live site URL (e.g. `https://your-app.vercel.app`).

## 4. Add your keys

1. **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. In the project folder, create/edit `.env.local` and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
   ```

   (These are safe to expose to the browser — the anon key is meant to be public, and RLS protects the data. `.env.local` is git-ignored.)

3. Restart the dev server: stop it (`Ctrl + C`) and run `npm run dev` again.

## 5. Try it

- Click **Sign in** in the header, enter your email, and open the magic link it sends.
- Any recipes/settings you’d saved on this device migrate up to your account automatically the first time you sign in.
- Save a recipe and log a brew, then sign in on another device — they’ll be there.

## Deploying to Vercel (later)

Add the same two env vars in **Vercel → Project → Settings → Environment Variables**, and add your Vercel URL to Supabase’s **Redirect URLs** (step 3). Redeploy.

---

If `Sign in` shows “Sync isn’t switched on yet,” the env vars aren’t loaded — double-check `.env.local` and that you restarted the server.
