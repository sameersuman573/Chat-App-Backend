import { ApiError } from "../utils/apiError.utils.js";
import { ApiResponse } from "../utils/apiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { Chat } from "../models/Chat.model.js";
import { User } from "../models/User.model.js";
import { ALERT, REFETCH_CHATS } from "../constants.js";
import { emitSocketEvent } from "../Socket/index.js";
import mongoose, { mongo, set } from "mongoose";
import { Messages } from "../models/Message.model.js";

const searchAvailiableUser = asyncHandler(async (req, res, next) => {
  try {
    // const {username} = req.query

    const { username = "" } = req.query;

    const user = await User.aggregate([
      {
        $match: {
          _id: {
            $ne: req.user._id,
            //   Avoid the logged in user from search
          },

          username: {
            $regex: req.query.username,
            $options: "i",
          },
        },
      },

      {
        $project: {
          username: 1,
          avatar: 1,
          email: 1,
        },
      },
    ]);

    return res.status(200).json(new ApiResponse(200, user, "Users"));
  } catch (error) {
    throw new ApiError(400, "Failed to search users");
  }
});

// It just Appends the all the members of a chat and the last message
const chatCommonAggregation = () => {
  return [
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "members",
        pipeline: [
          {
            $project: {
              fullname: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },

    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "chat",
        as: "message",
        pipeline: [
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
                    email: 1,
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
        ],
      },
    },

    {
      $addFields: {
        message: { $first: "$message" },
      },
    },
  ];
};

// Utilty function responsible for removing all the messages and file attachment attached to the delted chat

// Alogorithm
// 1. Fetch the messages of the chat
// 2. fetch the Attachment and combine the message and attachments
// 3. Delete the messages of the chat
// 4. Remove attachment from the cloudinary... and localstorage
// 5. Delete all the messages
// const deleteCascadeChatMessages = async (chatId) => {

//   const messages = await Messages.find({
//     chat: chatId
//   })

//   Attachments.forEach((attachment) => {

//   })
//  }

const createAGroupChat = asyncHandler(async (req, res, next) => {
  const { name, members } = req.body;

  if (members.includes(req.user._id.toString())) {
    throw new ApiError(400, "You can't add yourself in the group");
  }

  if (members.length < 2) {
    return next(new ApiError(400, "Group chat must have atleast 3 members"));
  }

  const allMembers = [...new Set([...members, req.user._id])];
  // Avoiding duplicate members in the group

  const newGrpChat = await Chat.create({
    name,
    groupChat: true,
    members: allMembers,
    admin: req.user._id,
  });

  const ChatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: newGrpChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = ChatAggregation[0]; // store the aggregation result

  emitSocketEvent(req, allMembers ,REFETCH_CHATS, payload,);

  return res
    .status(201)
    .json(new ApiResponse(200, payload, "Group chat created successfully"));
});

// Algorithm
// 1.Fetch the receiver Id And check if its valid or not
// 2.Check if receiver and the user is not same
// 3.Check if the chat exists or not using aggragtion pipleines and return the chat
// 4.else create a new chat
// 5. Emit the event to the receiver and the user

const CreateorGetAOneoneChat = asyncHandler(async (req, res, next) => {
  const { receiverId } = req.body;

  // Check if the receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(400, "User not found");
  }
  const ReceiverID = receiver._id;

  // Check if the user is trying to chat with themselves
  if (receiver._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You can't chat with yourself");
  }

  // Fetch the logged-in user's details
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken",
  );
  const UserID = user._id;

  // Check if a one-on-one chat already exists
  const chat = await Chat.aggregate([
    {
      $match: {
        groupChat: false,
        $and: [
          { members: { $elemMatch: { $eq: UserID } } },
          { members: { $elemMatch: { $eq: ReceiverID } } },
        ],
      },
    },
    ...chatCommonAggregation(),
  ]);

  if (chat.length > 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "Chat found successfully"));
  }

  // Create a new one-on-one chat if it doesn't exist
  const newChat = await Chat.create({
    name: `${receiver.fullname}`, // Custom name based on participants' full names
    members: [UserID, ReceiverID],
    admin: UserID,
  });

  const ChatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: newChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = ChatAggregation[0]; // store the aggregation result

  // Emit event for the new chat
  payload.members.forEach((member) => {
    if (member._id.toString() === req.user._id.toString()) return;

    emitSocketEvent(req, member._id.toString(), REFETCH_CHATS, payload);
  });

  console.log(payload);

  // Return the created chat as a response
  return res
    .status(201)
    .json(new ApiResponse(201, payload, "New chat created successfully"));
});

const GetMyAllGroups = asyncHandler(async (req, res, next) => {
  // first find userId of whom you want to get the groups
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      throw new ApiError(400, "User not found");
    }

    const UserID = user._id;

    // Aggregation piplines

    const GroupChat = await Chat.aggregate([
      {
        $match: {
          members: {
            $elemMatch: {
              $eq: UserID,
            },
          },
          groupChat: true,
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },

      ...chatCommonAggregation(),
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, GroupChat, "Group Chat fetched Successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to get Groupchats");
  }
});

const GetGroupChats = () => {
  // find the term where groupChat is true then find your Id in the members array
  // aggrega tion
};

const GetMyALLChats = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -refreshToken",
    );

    console.log("User:", user);

    // Converting the string ObjectId to ObjectId type
    // const UserID = mongoose.Types.ObjectId(user._id)
    const UserID = user._id;

    console.log("UserID:", UserID);

    const chats = await Chat.aggregate([
      {
        $match: {
          members: { $elemMatch: { $eq: UserID } },
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      ...chatCommonAggregation(),
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, chats, "Chat fetched successfully"));
  } catch (error) {
    throw new ApiError(400, "Failed to get chats");
  }
});

const GetGroupChatsDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const Chatdetails = await Chat.findById(chatId);

  const groupchat = await Chat.aggregate([
    {
      $match: {
        _id: Chatdetails._id,
        // groupChat: true,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat = groupchat[0];

  // console.log(chat, "chat details");

  if (!chat) {
    throw new ApiError(404, "Group chat does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Chat fetched successfully"));
});

const DeleteGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "ChatID does not exist");
  }

  const members = chat.members;

  const groupchat = await Chat.aggregate([
    {
      $match: {
        _id: chat._id,
        // groupChat: true,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chatDetails = groupchat[0];

  if (!chatDetails) {
    throw new ApiError(404, "Group chat does not exist");
  }

  // The admin is the only one who can delete the group
  if (chatDetails.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can delete the group");
  }

  await Chat.findByIdAndDelete(chat._id);

  emitSocketEvent(
    req,
    members,
    REFETCH_CHATS,
    "Group chat deleted successfully",
  );

  return res
    .status(200)
    .json(new ApiResponse(200, chatDetails, "Deleted Successfully the group"));
});

const DeleteOneonOneChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const Chatdetails = await Chat.findById(chatId);

  if (!Chatdetails) {
    throw new ApiError(404, "ChatID does not exist");
  }

  existingMembers = Chatdetails.members

  const ChatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: Chatdetails._id,
        groupChat: false,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const chat = ChatAggregation[0];

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  // The admin is the only one who can delete the group
  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can delete the group");
  }

  await Chat.findByIdAndDelete(Chatdetails._id);

  return res
    .status(200)
    .json(new ApiResponse(200, chat, "Deleted Successfully the group"));
});

const LeaveGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const IsGrpChat = await Chat.findOne({
    _id: chatId,
    groupChat: true,
  });

  if (!IsGrpChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const existingChatmembers = IsGrpChat.members;

  if (!existingChatmembers.includes(req.user._id.toString())) {
    throw new ApiError(401, "You are not a member of this group");
  }

  // Shifting admin concept

  const Checkadmin = IsGrpChat.admin.toString() === req.user._id.toString();

  if (Checkadmin) {
    if (existingChatmembers.length > 1) {
      const newAdmin = existingChatmembers.find(
        (member) => member != req.user._id.toString(),
      );
      await Chat.findByIdAndUpdate(
        chatId,
        {
          admin: newAdmin,
        },
        {
          new: true,
        },
      );
    } else {
      throw new ApiError(400, "You are the only member in the group");
    }
  }

  const updateChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        members: req.user?._id,
      },
    },
    {
      new: true,
    },
  );

  const checkIfremoved = updateChat.members.includes(req.user._id.toString());
  if (checkIfremoved) {
    throw new ApiError(400, "Failed to leave the group");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        _id: updateChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  emitSocketEvent(req, existingChatmembers ,ALERT, payload,);

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "You left the group successfully"));
});

const RenameGroupChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can rename the group");
  }

  const existingMembers = chat.members;


  const updateChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        name,
      },
    },
    { new: true },
  );

  const chatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: updateChat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chatAggregation[0];

  emitSocketEvent(req, existingMembers,REFETCH_CHATS , payload);

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Group name changed successfully"));
});

const AddMembersToGroup = asyncHandler(async (req, res) => {
  const { chatId, memberId } = req.body;

  const checkMember = await User.findById(memberId);
  if (!checkMember) {
    throw new ApiError(404, "Member does not exist");
  }

  const chat = await Chat.findOne({
    _id: chatId,
    groupChat: true,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can add members to the group");
  }

  const existingMembers = chat.members;

  if (existingMembers?.includes(memberId)) {
    throw new ApiError(400, "Member already exists exists in the group");
  }

  const updatechat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: {
        members: memberId,
      },
    },
    {
      new: true,
    },
  );

  const chatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: updatechat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chatAggregation[0];

  emitSocketEvent(req, existingMembers ,ALERT , payload);
  emitSocketEvent(req, existingMembers ,REFETCH_CHATS , payload);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        payload,
        "New member added to the group successfully",
      ),
    );
});

const RemoveMembersFromGroup = asyncHandler(async (req, res) => {
  const { chatId, memberId } = req.body;

  const checkMember = await User.findById(memberId);
  if (!checkMember) {
    throw new ApiError(404, "Member does not exist");
  }

  const chat = await Chat.findOne({
    _id: chatId,
    groupChat: true,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can add members to the group");
  }

  const existingMembers = chat.members;

  if (!existingMembers?.includes(memberId)) {
    throw new ApiError(
      400,
      "Member already doesnot exists exists in the group",
    );
  }

  const updatechat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: {
        members: memberId,
      },
    },
    {
      new: true,
    },
  );

  const chatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: updatechat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chatAggregation[0];

  emitSocketEvent(req, existingMembers, ALERT, payload);
  emitSocketEvent(req, existingMembers, REFETCH_CHATS, payload);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        payload,
        "New member Removed from the group successfully",
      ),
    );
});

const AssignAdmin = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { memberId } = req.params;

  const checkMember = await User.findById(memberId);
  if (!checkMember) {
    throw new ApiError(404, "Member does not exist");
  }

  const chat = await Chat.findOne({
    _id: chatId,
    groupChat: true,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  if (chat.admin.toString() !== req.user._id.toString()) {
    throw new ApiError(401, "Only the admin can add admin to the group");
  }

  const existingMembers = chat.members;


  // check if the member is not previously an admin

  if (chat.admin.toString() == memberId) {
    throw new ApiError(400, "Member is already an admin");
  }

  const updatechat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        admin: memberId,
      },
    },
    {
      new: true,
    },
  );

  const chatAggregation = await Chat.aggregate([
    {
      $match: {
        _id: updatechat._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chatAggregation[0];

  emitSocketEvent(req,existingMembers , ALERT, payload);
  emitSocketEvent(req,existingMembers , REFETCH_CHATS, payload);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        payload,
        "New admin assigned to the group successfully",
      ),
    );

  //
});

export {
  searchAvailiableUser,
  CreateorGetAOneoneChat,
  createAGroupChat,
  GetMyALLChats,
  GetMyAllGroups,
  GetGroupChatsDetails,
  DeleteGroupChat,
  DeleteOneonOneChat,
  LeaveGroupChat,
  RenameGroupChat,
  AddMembersToGroup,
  RemoveMembersFromGroup,
  AssignAdmin,
};
