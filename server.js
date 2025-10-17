// server.js
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// ✅ Map your price IDs from Stripe Dashboard
const priceMap = {
  "1day": process.env.PRICE_ID_1D,
  "7days": process.env.PRICE_ID_7D,
  "1month": process.env.PRICE_ID_30D,
};

/**
 * ✅ Create Checkout Session
 * Frontend calls this route to get the Stripe URL.
 * We redirect back to /boosting with query params for plan + listingId
 */
app.post("/create-checkout-session", async (req, res) => {
  const { listingId, planId } = req.body;

  if (!listingId || !planId) {
    return res.status(400).json({ error: "Missing listingId or planId" });
  }

  const priceId = priceMap[planId];
  if (!priceId) {
    return res.status(400).json({ error: "Invalid planId" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `http://localhost:5173/boosting?status=success&plan=${planId}&listing=${listingId}`,
      cancel_url: `http://localhost:5173/boosting?status=failed`,
      metadata: {
        listingId,
        planId,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Start server
const PORT = 4242;
app.listen(PORT, () => {
  console.log(`🚀 Stripe backend running at http://localhost:${PORT}`);
});
