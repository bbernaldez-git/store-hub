# Grocery Hub

Stores share one product catalog and each sets its own price and stock. Customers search once and compare stores.
Postgres (Neon) database, hosted on Vercel. No terminal needed.

## Deploy (all in your browser, about 15 minutes)

### 1. Put the code on GitHub
1. Create a free account at https://github.com and click **New repository**. Name it `grocery-hub`, keep it **Private**, click **Create**.
2. On the new repo page click **uploading an existing file**.
3. Unzip this project on your computer. Open the unzipped `grocery-hub` folder, select everything inside it
   (the `src` folder, `package.json`, `README.md` and so on), and drag it into the GitHub page.
4. Wait for the upload to finish, then click **Commit changes**.

### 2. Create the project on Vercel
1. Go to https://vercel.com and sign up with GitHub.
2. Click **Add New > Project**, choose your `grocery-hub` repo, click **Deploy**. The first deploy will work but the
   site can't reach a database yet. That's expected.

### 3. Add the database
1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database**, choose **Neon** (Postgres), pick the free plan and a region near you (Singapore is closest to the Philippines), and connect it to your project.
3. Vercel adds `DATABASE_URL` for you.

### 4. Set your admin password
1. Project **Settings > Environment Variables**.
2. Add `ADMIN_PASSWORD` with a long password only you know. Save.
3. Go to **Deployments**, click the three dots on the latest one, choose **Redeploy**.

### 5. Create your first store
1. Open `https://YOUR-SITE.vercel.app/admin`.
2. Enter your admin password, then a Store ID (like `STORE-001`), store name, location and a store password. Click **Save store**.
3. Click **Add sample products** to try it out (optional).
4. Sign in at `/login` with the Store ID and password. Give each store owner their own login the same way.

Customers just use the main page, `/`.

## Notes
- Tables are created automatically on first use.
- The database blocks duplicate barcodes and duplicate name+size, even if two stores add the same item at once.
- To hide a bad product, open the Neon dashboard (Storage tab > your database > Open in Neon) and set that product's `status` to `rejected` in the `products` table.
- Optional: add `AUTH_SECRET` (32+ random characters). If empty, one is derived from your database URL.
- Add login rate limiting before opening to the public.
- Search stays fast: the customer page loads a slim product list once and searches it in the browser.
- Running locally is optional: copy `.env.example` to `.env.local`, fill `DATABASE_URL` from Vercel, then `npm install` and `npm run dev`.
