import { Account } from "../models/Account.model.js";
import { Transaction } from "../models/Transaction.model.js";
import { User } from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { ApiError } from "../utils/apiError.utils.js";
import mongoose from "mongoose";


const GetBalance = asyncHandler(async(req , res , next) => {

    const user = req.user._id;
   
    const account = await Account.findOne({ userID: user });
    console.log("This is my account " , account);


    if(!account){
        throw new ApiError(401 , "Account doesnot exists for balance")
    }

    return res.status(201).json(
        new ApiResponse(201 , {balance: account.balance} , "Account balance found successfully")
    )
})



// Algorithm
// 1. start the session
// 2. start the transcation
// 3. fetch the details of the user whose amount balancewill be considered for transfer
// 4. fetch the details of the user to whom the money will be transfered
// 5. if any othe two you donot find abort the transaction
// 6. perform the tranfer 
// 7. commit the transaction
 
 

const Transfer = asyncHandler(async (req, res) => {
    
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { amount, to } = req.body;
            const user = req.user._id;

            const account = await Account.findOne({ userID: user }).session(session);
            if (!account || account.balance < amount) {
                throw new ApiError(410, "No sufficient balance");
            }

            const toAccount = await Account.findOne({ userID: to }).session(session);
            if (!toAccount) {
                throw new ApiError(411, "Invalid account for transfer of money");
            }


            const FromUser = await User.findById(user).session(session);
            const ToUser = await User.findById(to).session(session)

            await Account.updateOne(
                { userID: user },
                { $inc: { balance: -amount } }
            ).session(session);

            await Account.updateOne(
                { userID: to },
                { $inc: { balance: amount } }
            ).session(session);


            // creating the trasaction history in the database
            const TransactionHistory = await Transaction.create([{
                From: user,
                Fromusername: FromUser.username,
                To: to,
                Tousername: ToUser.username,
                amount: amount,
                timestamp: new Date()
            }], { session });

            // console.log(TransactionHistory);

        });

        session.endSession();
        return res.status(200).json(new ApiResponse(200, "Funds Transferred successfully"));
    } catch (error) {
        // Ensure transaction is aborted
        // await session.abortTransaction();
        session.endSession();

        // Log error for debugging purposes
        console.error('Transaction Error:', error);

        // Ensure the response status and message are consistent
        return res.status(401).json(new ApiResponse(401, error.message || "Transaction failed due to several errors - funds rollback"));
    }
});





const TransactionProfile = asyncHandler(async (req, res) => {
    const { Fromusername } = req.params;
  
    if (!Fromusername.trim()) {
      throw new ApiError(402, "Fromusername is missing");
    }
  
    const Transactionhistory = await Transaction.aggregate([
      {
        $match: {
          Fromusername: Fromusername.trim().toLowerCase(),
        },
      },
  
      {
        $project: {
          Tousername: 1,
          _id: 1,
          amount: 1,
        },
      },
    ]);
  
    if (!Transactionhistory.length) {
      throw new ApiError(402, "Transactionhistory doesnot exists");
    }
  
    return res
      .status(200)
      .json(
        new ApiResponse(
          201,
          Transactionhistory,
          "Transactionhistory fetched successfully",
        ),
      );
  });
  


export {
    GetBalance , Transfer , TransactionProfile
}