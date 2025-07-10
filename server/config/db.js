import mongoose from "mongoose";

const connectDB = async () => {
  console.log("mongoenv ", process.env.MONGODB_URI);
  try {
    mongoose.connection.on("connected", () =>
      console.log("Database connected")
    );
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
  } catch (error) {
    console.log(error.message);
  }
};

export default connectDB;
