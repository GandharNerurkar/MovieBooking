import sendEmail from "../config/nodeMailer.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-booking" });

//inngest fnc to save user data to database
const syncUserCreation = inngest.createFunction(
    {id: 'sync-user-from-clerk'},
    {event: 'clerk/user.created'},
    async ({event})=>{
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.create(userData)
    }
)


const syncUserDeletion = inngest.createFunction(
    {id: 'delete-user-from-clerk'},
    {event: 'clerk/user.deleted'},
    async ({event})=>{
        const {id} = event.data
        await User.findByIdAndDelete(id)
    }
)

const syncUserUpdation = inngest.createFunction(
    {id: 'update-user-from-clerk'},
    {event: 'clerk/user.updated'},
    async ({event})=>{
        const {id, first_name, last_name, email_addresses, image_url} = event.data
        const userData = {
            _id: id,
            email: email_addresses[0].email_address,
            name: first_name + ' ' + last_name,
            image: image_url
        }
        await User.findByIdAndUpdate(id, userData)
    }
)

//Function to release seats of show after 10 min of booking if payment not done
const releaseSeatsAndDeleteBooking = inngest.createFunction(
    {id: 'release-seats-delete-booking'},
    {event: "app/checkpayment"},
    async ({event, step}) => {
        const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
        await step.sleepUntil('wait-for-10-minutes', tenMinutesLater);

        await step.run('check-payment-status', async () => {
            const bookingId = event.data.bookingId;
            const booking = await Booking.findById(bookingId)
            //if payment not made release seat & delete booking
            if(!booking.isPaid){
                const show = await Show.findById(booking.show);
                booking.bookedSeats.forEach((seat)=>{
                    delete show.occupiedSeats[seat]
                });
                show.markModified('occupiedSeats')
                    await show.save()
                    await Booking.findByIdAndDelete(booking._id)
                
            }
        })
    }
)

// Send email when user book show
const sendBookingConformationEmail = inngest.createFunction({
    id: 'send-booking-conformation-email'},
    {event: "app/show.booked"},
    async ({event, step})=>{
        const {bookingId} = event.data;

        const booking = await Booking.findById(bookingId).populate({
            path: 'show',
            populate: {path: "movie", model: "Movie"}
        }).populate('user')
        await sendEmail({
            to: booking.user.email,
            subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
            body: `<div style="font-family:Arial, sans-serif; line-height: 1.5;">
            <h2>Hi ${booking.user.name},</h2>
            <p>Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.</p>
            <p>
            <strong>Date:</strong> ${new Date(booking.show.showDateTime).toLocaleDateString('en-US', {timeZone: 'Asia/Kolkata'})}
            </p>
            <p>Enjoy th show!! 🍿</p>
            <p>Thanks for booking with us! <br/> - QuickShow Team - </p>
            </div>`
        })
    }
)



export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation, releaseSeatsAndDeleteBooking, sendBookingConformationEmail];