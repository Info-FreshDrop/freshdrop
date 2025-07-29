import { loadStripe } from '@stripe/stripe-js';

// You need to replace this with your actual Stripe publishable key from your Stripe dashboard
// Get it from: https://dashboard.stripe.com/apikeys
const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY_HERE');

export { stripePromise };