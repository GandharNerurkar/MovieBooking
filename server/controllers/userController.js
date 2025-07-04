import { clerkClient } from "@clerk/express";
import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";

export const getUserBookings = async(req, res)=> {
    try{
        const user = req.auth().userId;
        const booking = await Booking.find({user}).populate({path: 'show', populate: {path: 'movie'}}).sort({cratedAt: -1})
        res.json({success: true, booking})
    }catch(error){
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

// add to fav

export const updateFavorite = async(req, res)=> {
    try{
        const {movieId} = req.body;
        const userId = req.auth().userId;
        const user = await clerkClient.users.getUser(userId)
        if(!user.privateMetadata.favorites){
            user.privateMetadata.favorites = []
        }
        if(!user.privateMetadata.favorites.includes(movieId)){
            user.privateMetadata.favorites.push(movieId)
        }else{
             user.privateMetadata.favorites = user.privateMetadata.favorites.filter(item => item !== movieId)
        }
        await clerkClient.users.updateUserMetadata(userId, {privateMetadata:user.privateMetadata})
        res.json({success:true, message: "Favourite added Updated"})
    }catch(error){
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}

export const getFavourites = async (res, req)=>{
    try{
        const user = await clerkClient.users.getUser(req.auth().userId)
        const favorites = user.privateMetadata.favorites;

        //get movies from database
        const movies = await Movie.find({_id: {$in: favorites}})
        res.json({success:true, movies})

    }catch(error){
        console.log(error.message)
        res.json({success: false, message: error.message})
    }
}