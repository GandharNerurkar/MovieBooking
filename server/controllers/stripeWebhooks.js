import stripe from "stripe";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

export const stripeWebhooks = async (request, response) => {
  console.log("test");
  const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
  const sig = request.headers["stripe-signature"];

  let event;

  try {
    console.log("env: ", process.env.STRIPE_WEBHOOKS_SECRET);
    event = stripeInstance.webhooks.constructEvent(
      request.body,
      sig,
      process.env.STRIPE_WEBHOOKS_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error.message);
    return response.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    console.log(event);
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        // Get session associated with this payment intent
        const sessionList = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessionList.data[0];
        if (!session) {
          console.warn("No session found for paymentIntent:", paymentIntent.id);
          break;
        }

        const bookingId = session.metadata?.bookingId;
        console.log(bookingId);

        console.log("Event received:", event.type);
        console.log("PaymentIntent ID:", paymentIntent.id);
        console.log("Session metadata:", session.metadata);
        console.log("Booking ID:", bookingId);

        if (!bookingId) {
          console.warn("No bookingId found in session metadata.");
          break;
        }

        const result = await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: "",
        });
        

 await inngest.send({
          name: 'app/show.booked',
          data: {bookingId}
        })


        //Send confirmation email
        await inngest.send({
          name: 'app/show.booked',
          data: {bookingId}
        })

        if (!result) {
          console.error(
            " Booking update failed. No booking found with ID:",
            bookingId
          );
        } else {
          console.log(`Booking updated to isPaid: true (ID: ${bookingId})`);
        }

        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    response.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    response.status(500).send("Internal Server Error");
  }
};
