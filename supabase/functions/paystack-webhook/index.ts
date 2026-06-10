// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface PaystackWebhookData {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paid_at: string;
    customer: {
      email: string;
    };
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const body: PaystackWebhookData = await req.json()
    console.log('Webhook received:', body.event, body.data.reference)

    // Verify webhook signature (recommended for production)
    // const signature = req.headers.get('x-paystack-signature')
    // const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    // if (secret && signature) {
    //   const expectedSignature = crypto.createHmac('sha512', secret).update(JSON.stringify(body)).digest('hex')
    //   if (signature !== expectedSignature) {
    //     return new Response('Invalid signature', { status: 400 })
    //   }
    // }

    if (body.event === 'charge.success') {
      const { reference, status, amount } = body.data

      if (status === 'success') {
        // Verify payment with Paystack API
        const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
        if (!paystackSecret) {
          console.error('PAYSTACK_SECRET_KEY not configured')
          return new Response('Server configuration error', { status: 500 })
        }

        const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: {
            'Authorization': `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
        })

        const verifyData = await verifyResponse.json()

        if (verifyData.status && verifyData.data.status === 'success') {
          // Find and update order
          const { data: order, error: findError } = await supabase
            .from('orders')
            .select('*')
            .eq('payment_ref', reference)
            .single()

          if (findError || !order) {
            console.error('Order not found for reference:', reference)
            return new Response('Order not found', { status: 404 })
          }

          if (order.payment_status === 'paid') {
            console.log('Payment already verified for reference:', reference)
            return new Response('Payment already verified', { status: 200 })
          }

          // Update order status to paid
          const { data: updatedOrder, error: updateError } = await supabase
            .from('orders')
            .update({ payment_status: 'paid' })
            .eq('id', order.id)
            .select()
            .single()

          if (updateError) {
            console.error('Failed to update order status:', updateError)
            return new Response('Failed to update order', { status: 500 })
          }

          // Log transaction
          const { error: txError } = await supabase
            .from('transactions')
            .insert({
              user_id: order.user_id,
              type: 'purchase',
              amount: -order.amount,
              status: 'completed',
              reference: `TXN-${Date.now()}`
            })

          if (txError) {
            console.error('Failed to log transaction:', txError)
          }

          console.log('Payment verified and order updated:', reference)
          return new Response('Payment verified successfully', { status: 200 })
        } else {
          console.error('Payment verification failed:', verifyData)
          return new Response('Payment verification failed', { status: 400 })
        }
      }
    }

    return new Response('Event not handled', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
