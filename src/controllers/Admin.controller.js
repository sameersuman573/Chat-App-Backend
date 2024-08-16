import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { Chat } from "../models/Chat.model.js";
import { User } from "../models/User.model.js";
import { Messages } from "../models/Message.model.js";

// Algorithm
// 1. Get the PAssword from the body
// 2. mathc the password
// 3. Get the token and then with that token

const adminLogin = asyncHandler(async (req, res) => {
  const { secretKey } = req.body;

  const adminSecretkey = process.env.ADMIN_SECRET_KEY;

  const isMatch = secretKey === adminSecretkey;

  if (!isMatch) {
    throw new ApiError(401, "The Secret Key Doesnot Matched");
  }

  const options = {
    httpOnly: true,
    // secure: true,
  };

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200) 
    .cookie("chattu-admin-token", token, {
      ...options,
      maxAge: 1000 * 60 * 15,
    }).json({
      success: true,
      message: "Authenticated Successfully, Welcome Chief",
    });
});


const getAdminData = asyncHandler(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});



const adminLogout = asyncHandler(async (req, res) => {

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
  .status(200)
  .cookie("chattu-admin-token", "", {
    ...options,
    maxAge: 0,
  })
  .json({
    success: true,
    message: "Logged Out Successfully",
  });
});

const GetallUsers = asyncHandler(async (req, res) => {
  try {
    const AggregateData = await User.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $project: {
          username: 1,
          email: 1,
          fullname: 1,
          avatar: 1,
          createdAt: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, AggregateData, "All Users Retrived Successfully"),
      );
  } catch (error) {
    throw new ApiError(400, "Failed to get Groupchats");
  }
});

const GetallChats = asyncHandler(async (req, res) => {
  const AggregateData = await Chat.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "admin",
        foreignField: "_id",
        as: "admin",
        pipeline: [
          {
            $project: {
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        admin: { $arrayElemAt: ["$admin", 0] },
      },
    },

    {
      $project: {
        name: 1,
        groupChat: 1,
        admin: 1,
        members: { $size: "$members" },
        message: { $size: "$message" },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, AggregateData, "All Chats Retrived Successfully"),
    );
});

const GetallMessages = asyncHandler(async (req, res) => {
  const AggregateData = await Messages.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "sender",
        foreignField: "_id",
        as: "sender",
        pipeline: [
          {
            $project: {
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        sender: { $first: "$sender" },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, AggregateData, "All Messages Retrived Successfully"),
    );
});

const groupChatCount = [
  {
    $match: { groupChat: true },
  }, 

  {
    $count: "GroupCount",
  },
];

const userCount = [
  {
    $count: "UsersCount",
  },
];

const MessageCount = [
  {
    $count: "MessagesCounts",
  },
];

const ChatCount = [
  {
    $count: "TotalChatsCount",
  },
];

const MessagesChartPipline = [
  {
    $match: {
      createdAt: {
        $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        $lte: new Date(),
      },
    },
  },

  {
    $project: {
      day: {
        $dayOfMonth: "$createdAt",
      },
    },
  },
  {
    $group: {
      _id: {
        day: "$day",
        month: { $month: "$createdAt" },
        year: { $year: "$createdAt" },
      },
      count: { $sum: 1 },
    },
  },
  {
    $sort: { _id: 1 },
  },
];

const GetDashboardStats = asyncHandler(async (req, res) => {
  try {
    const [
      GroupChatStats,
      userStats,
      messageStats,
      chatStats,
      MessageChartData,
    ] = await Promise.all([
      Chat.aggregate(groupChatCount),
      User.aggregate(userCount),
      Messages.aggregate(MessageCount),
      Chat.aggregate(ChatCount),
      Messages.aggregate(MessagesChartPipline),
    ]);

    // Extracting the count from result
    const GroupsCount =
      GroupChatStats.length > 0 ? GroupChatStats[0].GroupCount : 0;

    const UsersCount = userStats.length > 0 ? userStats[0].UsersCount : 0;

    const MessagesCount =
      messageStats.length > 0 ? messageStats[0].MessagesCounts : 0;

    const TotalChatsCount =
      chatStats.length > 0 ? chatStats[0].TotalChatsCount : 0;
 
    const messages = new Array(7).fill(0);

    MessageChartData.forEach((item) => {
      const dayIndex = new Date(
        item._id.year,
        item._id.month - 1,
        item._id.day,
      ).getDay();

      messages[6 - dayIndex] = item.count;
    });

    const stats = {
      GroupsCount,
      UsersCount,
      MessagesCount,
      TotalChatsCount,
      messagesChart: messages,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, stats, "Stats fetched Successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to get Stats");
  }
});

export { GetallUsers, GetallChats, GetallMessages, GetDashboardStats , adminLogin , adminLogout, getAdminData};
