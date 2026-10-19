# Dyserrealm Script

A responsive community feed for sharing ideas, guides, technology notes, and updates. Built with HTML, CSS, JavaScript, and Supabase Auth/Postgres.

## 1. Set up the database

1. Open your Supabase project.
2. Go to **SQL Editor** and create a new query.
3. Copy all of `supabase-setup.sql` into the editor and click **Run**.

The SQL enables row-level security. Posts are publicly readable; only signed-in users can create posts, and users can only edit/delete their own posts.

## 2. Configure Supabase Auth

In Supabase, open **Authentication → URL Configuration** and set:

- **Site URL:** `https://haralampos2009.github.io/Dyserrealm-Script/`
- **Redirect URLs:** add `https://haralampos2009.github.io/Dyserrealm-Script/**`

If email confirmation is enabled, new users must click the confirmation email before logging in. Never put a Supabase `service_role` or secret key in frontend files. The publishable key in `app.js` is designed for browser use with Row Level Security enabled.

## 3. Publish with GitHub Pages

1. Open the repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`, then save.
4. Wait a minute or two and open: https://haralampos2009.github.io/Dyserrealm-Script/

## Included

- Responsive dark UI with green accents
- Email/password sign-up and login
- Create and browse posts
- Category filters
- Supabase Row Level Security policies

Comments and richer profile pages can be added in a later iteration.


## 4. Enable script screenshots and photos

For an already deployed site, open **Supabase → SQL Editor**, create a query, paste the complete contents of `script-image-upload-migration.sql`, and click **Run** once. This adds the image field and the `script-images` storage bucket with policies that allow public viewing but restrict uploads to signed-in users' own folders. Do this before trying to publish scripts with images. Fresh database installations can use the updated `supabase-setup.sql` instead.

When publishing a script, users can attach up to four JPG, PNG, WEBP or GIF images (5 MB per image). The first image appears on the library card; all images appear in the script details.


## 5. Script prices

Run `script-price-migration.sql` in Supabase SQL Editor once for the existing deployed database. New listings can then have a price in Robux, USD, or EUR. A price of zero is shown as **FREE**. The site displays prices only; it does not process payments or transfer currency.
