
import mongoose , {Schema} from 'mongoose'
import {z} from "zod"

const requestSchema = new Schema({
     
    sender:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },

    receiver:{
        type:Schema.Types.ObjectId,
        ref:"User",
    },

    status:{
        type:String,
        enum: ["Pending","Accepted","Declined"],
        default: 'Pending', // Default value for status
    },


    }, {timestamps:true}
)

export const Request = mongoose.model("Request",requestSchema)