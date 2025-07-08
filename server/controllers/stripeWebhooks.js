import stripe from "stripe";
import Booking from "../models/Booking.js";

export const stripeWebhooks = async(req, res) => {
    const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
    constsig = request.headers['stripe-signature'];

    let event;

    try{
        event = stripeInstance.webhooks.constructEvent(request.body, AbortSignal, process.env.STRIPE_WEBHOOKS_SECRET)
    }catch(error){
        return Response.status(400).send(`Webhook Error: ${error.messaage}`);
    }

    try{
        switch (event.type){
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const sessionList = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntent.id
                })
                const session = sessionList.data[0];
                const {bookingId} = session.metadata;

                await Booking.findByIdAndUpdate(bookingId, {
                    isPaid: true,
                    paymentLink: ""
                })
                break;
            }
                

            default:
                console.log("Unhandled event type: ", event.type)
        }
        response.json({received: true})
    }catch(err){
        console.log("Webhook processing error:", err);
        res.status(500).send("Internal Server Error")
    }
}