import { set } from "mongoose";
import sendEmail from "../config/nodeMailer.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import { Inngest } from "inngest";


// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-booking" });

//inngest fnc to save user data to database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.create(userData);
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

//Function to release seats of show after 10 min of booking if payment not done
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);
      //if payment not made release seat & delete booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(booking._id);
      }
    });
  }
);

const sendBookingConformationEmail = inngest.createFunction(
  {
    id: "send-booking-conformation-email",
  },
  { event: "app/show.booked" },
  async ({ event, step }) => {
    const { bookingId } = event.data;

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      }).populate("user");
    await sendEmail({
      to: booking.user.email,
      subject: `Payment Confirmation: "${booking.show.movie.title}" booked!`,
      body: `<div style="font-family: Arial, sans-serif; background-color: #fff; padding: 20px; color: #000;">
  <div style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); padding: 30px;">
    <h2 style="color: #D63854;">Hi ${booking.user.name},</h2>
    <p style="font-size: 16px; color: #000;">
      Your booking for <strong style="color: #F84565;">"${booking.show.movie.title}"</strong> is confirmed.
    </p>
    <p style="font-size: 16px; color: #000;">
      <strong style="color: #D63854;">Date:</strong>
      ${new Date(booking.show.showDateTime).toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" })}
    </p>
    <p style="font-size: 16px; color: #000;">
      Enjoy the show!! <span style="font-size: 20px;">🍿</span>
    </p>
    <p style="font-size: 16px; color: #000;">
      Thanks for booking with us!<br/>
      <span style="color: #F84565;"><strong>- QuickShow Team -</strong></span>
    </p>
  </div>
</div>`
    });
  }
);

//Inngest function to add reminders
const sendShowReminders = inngest.createFunction(
  {id: "send-show-reminders"},
  {cron: "0 */8 * * *"},
  async ({step}) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    const reminderTasks = await step.run("prepare-reminder-tasks", async ()=> {
      const shows = await Show.find({
        showTime: {$gte: windowStart, $lte: in8Hours},
      }).populate('movie');
      const tasks = [];
      for(const show of shows){
        if(!show.movie || !show.occupiedSeats) continue;
        const userIds = [...new set(Object.values(show.occupiedSeats))];
        if(userIds.length === 0) continue;

        const users = await User.find({_id: {$in: userIds}}).select("name email");

        for(const user of users){
          tasks.push({
            userEmail: user.email,
            userName: user.name,
            movieTitle: show.movie.title,
            showTime: show.showTime,
          })
        }
      }
      return tasks
    })
    if(reminderTasks.length === 0){
      return {sent: 0, message: "No reminders to send"}
    }
    //send reminder email
    const results = await step.run('Send-all-reminders', async ()=>{
      return await Promise.allSettled(
        reminderTasks.map(task => sendEmail({
          to: task.userEmail,
          subject: `Reminder: Your movie "${task.movieTitle}" starts soon!`,
          body: `<div style="font-family: Arial, sans-serif; background-color: #fff; padding: 20px; color: #000;">
  <div style="max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); padding: 30px;">
    <h2 style="color: #D63854;">Hi ${task.UserName},</h2>
    <p style="font-size: 16px; color: #000;">
      This is a quick reminder that your movie <strong style="color: #F84565;">"${task.movieTitle}"</strong> is about to start soon!
    </p>
    <p style="font-size: 16px; color: #000;">
      <strong style="color: #D63854;">Showtime:</strong>
      ${new Date(task.showTime).toLocaleString("en-US", { timeZone: "Asia/Kolkata" })}
    </p>
    <p style="font-size: 16px; color: #000;">
      Please arrive a few minutes early, grab your snacks, and enjoy the experience! 🎬🍿
    </p>
    <p style="font-size: 16px; color: #000;">
      Wishing you a great time!<br/>
      <span style="color: #F84565;"><strong>- QuickShow Team -</strong></span>
    </p>
  </div>
</div>
`
        }))
      )
    })
    const sent = results.filter(r => r.status === "fulfilled").length;

    const failed = results.length - sent;

    return {
      sent, 
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed.`
    }
  }
)

// const sentNewShowNotifications = inngest.createFunction(
//   {id: "sent-new-show-notifications"},
//   {event: "app/show.added"},
//   async ({event}) => {
//     const { movieTitle} = event.data;

//     const users = await User.find({})

//     for(const user of users){
//       const userEmail = user.email;
//       const userName = user.name;

//       console.log(`📧 Sending email to: ${userEmail}`);

//       const subject = `🎬 New Show Added: ${movieTitle}`;
//       const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
//       <h2>Hi ${userName},</h2>
//       <p>We've just added a new show to our library:</p>
//       <h3 style="color: #F84565;">"${movieTitle}"</h3>
//       <p>Visit out website</p>
//       <br/>
//       <p>Thanks, <br/>QuickShow Team</p>
//       </div>`;

//       const res = await sendEmail({
//         to: userEmail,
//         subject,
//         body,
//       })
//       console.log(`✅ Email send result for ${userEmail}:`, res.messageId);
//     }
//     return {message: "Notification sent."}

//   }
// )

const sentNewShowNotifications = inngest.createFunction(
  { id: "sent-new-show-notifications" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle, movieId } = event.data;

    const shows = await Show.find({ movie: movieId });

    // If notifications already sent for any show of this movie, exit early
    if (shows.length > 0 && shows[0].notificationsSent) {
      console.log("⚠️ Notifications already sent for this movie.");
      return { message: "Already notified." };
    }

    const users = await User.find({});
    for (const user of users) {
      const subject = `🎬 New Show Added: ${movieTitle}`;
      const body = `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Hi ${user.name},</h2>
        <p>We've just added a new show to our library:</p>
        <h3 style="color: #F84565;">"${movieTitle}"</h3>
        <p>Visit our website to book your seat!</p>
        <br/>
        <p>Thanks,<br/>QuickShow Team</p>
      </div>`;

      const res = await sendEmail({ to: user.email, subject, body });
      console.log(`✅ Email sent to ${user.email}: ${res.messageId}`);
    }

    // ✅ Mark all shows of this movie as notified
    await Show.updateMany({ movie: movieId }, { $set: { notificationsSent: true } });

    return { message: "Notifications sent." };
  }
);


export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendBookingConformationEmail,
  sendShowReminders,
  sentNewShowNotifications
];
