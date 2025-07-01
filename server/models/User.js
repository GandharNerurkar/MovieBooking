import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    _id: {type: String, require: true},
    name: {type: String, require: true},
    email: {type: String, require: true},
    image: {type: String, require: true}
})

const User = mongoose.model('user', userSchema)

export default User;