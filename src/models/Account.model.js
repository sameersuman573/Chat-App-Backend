import mongoose, { Schema } from "mongoose"


const AccountSchema = new Schema({
    userID:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }, 

    balance:{
        type: Number,
        required:true
    
    }
})

export const Account = mongoose.model("Account", AccountSchema)
