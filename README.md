# wad-project

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Running the Application

**IMPORTANT: You need to run BOTH the frontend AND backend servers for the Stripe boost feature to work.**

1. **Frontend (Vite dev server):**
   ```sh
   npm run dev
   ```

2. **Backend (Stripe payment server):**
   ```sh
   npm run server
   # or
   npm start
   ```

   The backend server will run on port 4242 by default (or the port specified in `PORT` env variable).

### Testing on Vercel Deployment

**For testing with your Vercel deployment (`https://homes-beige.vercel.app`):**

You have **two options**:

#### Option 1: Backend deployed (Recommended for production testing)
1. Deploy `server.js` to Render, Railway, or another hosting service
2. In Vercel dashboard → Settings → Environment Variables, add:
   - `VITE_API_URL` = Your deployed backend URL (e.g., `https://your-backend.onrender.com`)
3. Redeploy your Vercel frontend

#### Option 2: Local backend with Vercel frontend (For quick testing)
This **WON'T work** because Vercel can't reach `localhost:4242`. You need to:
- Either test fully locally (`localhost:5173` → `localhost:4242`)
- Or deploy the backend first (Option 1)

**Current setup check:**
- Your frontend is at: `https://homes-beige.vercel.app`
- Your backend needs to be deployed somewhere or run locally
- If backend is deployed, set `VITE_API_URL` in Vercel to point to it

### Environment Variables

Make sure your `.env` file contains:
- `STRIPE_SECRET_KEY` - Your Stripe secret key (use `sk_test_...` for testing, `sk_live_...` for production)
- `PRICE_ID_1D` - Stripe Price ID for 1 day boost
- `PRICE_ID_7D` - Stripe Price ID for 7 days boost
- `PRICE_ID_30D` - Stripe Price ID for 1 month boost
- `FRONTEND_URL` - Your frontend URL (defaults to https://homes-beige.vercel.app)

### Stripe Keys: Test vs Live

- **Use TEST keys (`sk_test_...`)** when:
  - Developing locally
  - Testing payment flows
  - Not ready to process real payments
  
- **Use LIVE keys (`sk_live_...`)** when:
  - The application is in production
  - You want to process real payments
  - You've thoroughly tested everything with test keys first

**⚠️ Warning:** Never commit live Stripe keys to version control. Always use environment variables.

### Testing Payments

With TEST Stripe keys, you can use Stripe's test card numbers. See `STRIPE_TEST_CARDS.md` for a complete list of test cards.

**Quick test card:**
- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/34`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Troubleshooting

**"Boost with Stripe" button loads forever:**
- ✅ Make sure the backend server is running (`npm run server`)
- ✅ Check that port 4242 is available
- ✅ Verify `.env` file has all required Stripe keys

**Payment fails:**
- ✅ Ensure you're using TEST keys and test card numbers (see above)
- ✅ Check browser console for errors
- ✅ Check backend server console for errors

### Compile and Minify for Production

```sh
npm run build
```
