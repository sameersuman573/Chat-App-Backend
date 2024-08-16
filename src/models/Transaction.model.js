import mongoose, { Schema } from "mongoose";


const TransactionHistory = new Schema({

    From:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }, 

    Fromusername:{
        type:String,
        required:true
        },

    To:{
        type:Schema.Types.ObjectId,
        red:"User",
        required:true
    },

    Tousername:{
        type:String,
        required:true
    },

    amount:{
        type:Number,
        required:true
    },

    timestamp:{
        type:Date,
        default:Date.now
    }
}, {timestamps:true})


export const Transaction = mongoose.model("Transaction", TransactionHistory)