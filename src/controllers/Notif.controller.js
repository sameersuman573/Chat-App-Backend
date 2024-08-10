import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { Request } from "../models/Request.model.js";
import { ApiError } from "../utils/apiError.utils.js";
import { User } from "../models/User.model.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";

// Send Notification
// 1. Verify yourself using middleware
// 2. check if the user is alreday in the friend list
// 3. check if the user is already in the notification list
// 4. Get the userid or username from the request body
// 5. create a notification from the user who is sending the request
// 6. send the notification to the user
// 7. return the response

const SendNotif = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  try {
    // user
    const Sender = req.user._id;

    // reciever
    const receiver = await User.findById(userId);

    if (!receiver) {
      throw new ApiError(400, "Reciever not found");
    }

    const ReceiverID = receiver._id;

    const checkFriend = await Request.aggregate([
      {
        $match: {
          $or: [
            {
              sender: Sender,
              receiver: ReceiverID,
            },
            {
              sender: ReceiverID,
              receiver: Sender,
            },
          ],
          status: {
            $in: ["Accepted"],
          },
        },
      },
    ]);

    if (checkFriend.length > 0) {
      throw new ApiError(400, "user  is already in the friend list");
    }

    const checkNotif = await Request.aggregate([
      {
        $match: {
          sender: Sender,
          receiver:ReceiverID ,
        },
      },
    ]);

    if (checkNotif.length > 0) {
      throw new ApiError(400, "Notification is already sent");
    }

    const Notif = await Request.create({
      sender: Sender,
      receiver: ReceiverID,
      status: "Pending",
    });

    return res
      .status(200)
      .json(new ApiResponse(200, Notif, "Notification sent successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to send Notification", error);
  }
});

// Accept Connection
// 1. verify yourself using middleware
// 2. Get the Notification Id from the request body
// 3. check if the notification exists or not
// 4. check if the notification is already accepted or not
// 5. Find the notification by Id and update its status to Accepted
// 6. return the response

const AcceptConnection = asyncHandler(async (req, res) => {
  const user = req.user._id;

  try {
    const { notifId } = req.params;

    const CheckNotif = await Request.findById(notifId);

    if (!CheckNotif) {
      throw new ApiError(400, "Notification doesnot exists");
    }

    if (CheckNotif.status === "Accepted") {
      throw new ApiError(400, "Notification is already accepted");
    }

    const UpdateNotif = await Request.findByIdAndUpdate(
      notifId,
      {
        $set: { status: "Accepted" },
      },
      {
        new: true,
      },
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, UpdateNotif, "Notification Accepted Successfully"),
      );
  } catch (error) {
    throw new ApiError(400, "Failed to Accept Connection", error);
  }
});

// Reject Connection
// 1. verify yourself using the middleware
// 2. Get the notification Id from the request body
// 3. check if the notifiacaation exists or not
// 4. check if the notification is already declined or not
// 5. Find the notification by Id and update its status to declined
// 6. return the response

const RejectConnection = asyncHandler(async (req, res) => {
  const user = req.user._id;

  try {
    const { notifId } = req.params;

    const CheckNotif = await Request.findById(notifId);

    if (!CheckNotif) {
      throw new ApiError(400, "Notification doesnot exists");
    }

    if (CheckNotif.status === "Declined") {
      throw new ApiError(400, "Notification is already Declined");
    }

    const UpdateNotif = await Request.findByIdAndUpdate(
      notifId,
      {
        $set: { status: "Declined" },
      },
      {
        new: true,
      },
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, UpdateNotif, "Notification Declined Successfully"),
      );
  } catch (error) {
    throw new ApiError(400, "Failed to Declined Connection", error);
  }
});

// Get All Notifications
// 1. verify yourself using the middleware
// 2.use the Aggregation pipelines to get the notifications
// 3. First match the receiver id with your userID
// 4. Then Use lookup to fetch further more infomation about the sender
// 5. return the response

const GetMyAllNotif = asyncHandler(async (req, res) => {
  const user = req.user._id;

  try {
    const MyNotif = await Request.aggregate([
      {
        $match: {
          receiver: user,
        },
      },

      // I need to fetch the More Information about the sender
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },

      {
        $unwind: "$sender",
      },

      {
        $project: {
          sender: {
            username: 1,
            avatar: 1,
          },
          status: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, MyNotif, "Notifications fetched successfully"),
      );
  } catch (error) {
    throw new ApiError(400, "Failed to get Notifications", error);
  }
});

// Get All Friends
// 1.  Verify yourself using the middleware
// 2. Use the aggregation piplines to get the friends
// 3.

const GetmyFriends = asyncHandler(async (req, res) => {

  
  try {
    // sender
    const Sender = req.user._id;

    // receiver
    // const reciever = await User.findOne({ username });
    // if (!reciever) {
    //   throw new ApiError(400, "Reciver doesnot exists");
    // }
    // const ReceiverID = reciever._id;

    const Friends = await Request.aggregate(
      [
        {
          $match: {
            $and: [
              {
                $or: [
                  { sender: Sender },
                  { receiver: Sender }
                ]
              },
              {
                status: "Accepted"
              }
            ]
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "senderDetails"
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "receiver",
            foreignField: "_id",
            as: "receiverDetails"
          }
        },
        {
          $unwind: "$senderDetails"
        },
        {
          $unwind: "$receiverDetails"
        },
        {
          $project: {
            senderName: "$senderDetails.username",
            receiverName: "$receiverDetails.username"
          }
        }
      ]
      
    );

    if(Friends.length === 0){
      return res
      .status(200)
      .json(new ApiResponse(200, Friends, "No Friends found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, Friends, "Friends fetched successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to get Friends", error);
  }
});

export {
  SendNotif,
  AcceptConnection,
  RejectConnection,
  GetMyAllNotif,
  GetmyFriends,
};
