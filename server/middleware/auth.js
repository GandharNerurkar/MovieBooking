import { clerkClient } from "@clerk/express";

// export const protectAdmin = async (req, res, next)=> {
//     try{
//         const {userId} = req.auth();
//         const user = await clerkClient.users.getUser(userId)
//         if(user.privateMetadata.role !== 'admin'){
//             return res.json({success: false, message: "not authorized"})
//         }
//         next()
//     }catch(error){
//         return res.json({success: false, message: 'not authorized'})
//     }
// }

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = req.auth();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: No user ID" });
    }

    const user = await clerkClient.users.getUser(userId);

    if (user.privateMetadata.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Forbidden: Not an admin" });
    }

    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};
