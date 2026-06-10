# Paystack Webhook Implementation TODO

## Completed
- [x] Updated `createOrder` function to support pending payments
- [x] Added `verifyAndCompletePayment` function
- [x] Modified Checkout.tsx to create pending orders for Paystack payments
- [x] Implemented Paystack webhook handler in Supabase function

## Pending
- [ ] Login to Supabase CLI
- [ ] Deploy the webhook function
- [ ] Create payment pending page for user experience
- [ ] Test webhook with Paystack (may need ngrok for local testing)
- [ ] Configure Paystack webhook URL in dashboard
