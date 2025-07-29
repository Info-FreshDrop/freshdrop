import { loadStripe } from '@stripe/stripe-js';

// Replace this with your actual Stripe publishable key from: https://dashboard.stripe.com/apikeys
const stripePromise = loadStripe('pk_test_51QSaQqEaUEuU3l8VCBjDw4DUYmJkHwCOqZGZFHLzxVOmU1mKJZnYBYpEOsWXJOzMYRoQKhIgBJcBDDOvhFkJgJm00LJm2jKLm');

export { stripePromise };