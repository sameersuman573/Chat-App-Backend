import { ApiError } from "../utils/apiError.utils.js";
import { ApiResponse, MessageResponse } from "../utils/apiResponse.utils.js";
import { asyncHandler } from "../utils/asyncHandler.utils.js";
import { Messages } from "../models/Message.model.js";
import { Chat } from "../models/Chat.model.js";
import { uploadfile } from "../utils/cloudinary.utils.js";
import { User } from "../models/User.model.js";
import { emitSocketEvent } from "../Socket/index.js";
import {
  ALERT,
  REFETCH_CHATS,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  MESSAGE_DELETE_EVENT,
  TESTING_MESSAGE,
  NEW_MESSAGE
} from "../constants.js";

// It will just append the sender details to the message
const ChatMessageCommonAggregation = () => {
  return [
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
  ];
};

// Alogrithm
// 1.Fetch the chatId and message from the request body
// 2. Check if the message is empty or not
// 3. Check if the chatId is valid or not
// 4. Create path for attachments
// 5. create a message
// 6.update the message with last message
// 7. store the aggregation result
// 8. emit the event

const SendMessage = asyncHandler(async (req, res, next) => {
  // Ensure req.user._id is available
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken",
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const UserID = user._id;

  const { chatId } = req.params;
  
  const { message } = req.body;

  console.log("message:", message);
  console.log("req.file:", req.file);

  // Check if message is provided and is a string
  // if (!message || typeof message !== "string" || message.length === 0) {
  //   throw new ApiError(400, "Message content is required and must be a string");
  // } 


  const Isvalid = await Chat.findById(chatId);
  if (!Isvalid) {
    throw new ApiError(404, "Chat does not exist");
  }

  // Handle file attachment
  const Attachmentpath = req.file?.path;
  let AttachmentUrl;

  if (Attachmentpath) {
    try {
      AttachmentUrl = await uploadfile(Attachmentpath);
    } catch (error) {
      if (AttachmentUrl && AttachmentUrl.public_id) {
        await deleteUploadedFile(AttachmentUrl.public_id); // Implement delete logic as per Cloudinary API
      }
      throw new ApiError(400, "Failed to upload the File");
    } 
  }

  const newMessageData = {
    sender: UserID,
    message: message || "", 
    chat: chatId,
  };

  if (AttachmentUrl) {
    newMessageData.Attachments = [
      {
        public_id: AttachmentUrl.public_id,
        url: AttachmentUrl.url,
      },
    ];
  }

  // Create the new message
  const NewMessage = await Messages.create(newMessageData);

  // Update the chat with the last message ID
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        message: NewMessage._id,
      },
    },
    {
      new: true,
    },
  );

  const MessageAggregation = await Messages.aggregate([
    {
      $match: {
        _id: NewMessage._id,
      },
    },
    ...ChatMessageCommonAggregation(),
  ]);

  const receivedMessage = MessageAggregation[0];

 
  if (!receivedMessage) {
    throw new ApiError(500, "Internal server error");
  }

  // Emit socket events as needed
  chat.members.forEach((memberId) => {
    if (memberId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      memberId.toString(),
      NEW_MESSAGE_ALERT,
      receivedMessage,
    );

    emitSocketEvent(
      req,
      memberId.toString(),
      NEW_MESSAGE,
      receivedMessage,
    );

    emitSocketEvent(
      req,
      memberId.toString(),
      REFETCH_CHATS,
      receivedMessage,
    );
  });

  console.log("receivedMessage:", receivedMessage);

  // emitSocketEvent(req, REFETCH_CHATS, AttachmentUrl, `Getting All Messages`);

  return res
    .status(200)
    .json(new ApiResponse(200, { AttachmentUrl}, "Message sent successfully"));
});


const SendAttachmentOnly = asyncHandler(async (req, res, next) => {
  // Ensure req.user._id is available
  if (!req.user || !req.user._id) {
    throw new ApiError(401, "User not authenticated");
  }

  const user = await User.findById(req.user._id).select(
    "-password -refreshToken",
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const UserID = user._id;

  const { chatId } = req.params;
  
  const { message } = req.body;

  console.log("message:", message);
  console.log("req.file:", req.file);

  // Check if message is provided and is a string
  // if (!message || typeof message !== "string" || message.length === 0) {
  //   throw new ApiError(400, "Message content is required and must be a string");
  // } 


  const Isvalid = await Chat.findById(chatId);
  if (!Isvalid) {
    throw new ApiError(404, "Chat does not exist");
  }

  // Handle file attachment
  const Attachmentpath = req.file?.path;
  let AttachmentUrl;

  if (Attachmentpath) {
    try {
      AttachmentUrl = await uploadfile(Attachmentpath);

      if( !AttachmentUrl && !AttachmentUrl.url){
throw new ApiError(400 , "No URL returned")
      }

      // console.log("Checking Attachements", AttachmentUrl);
      // console.log("Checking URL", AttachmentUrl.url);


    } catch (error) {
      if (AttachmentUrl && AttachmentUrl.public_id) {
        await deleteUploadedFile(AttachmentUrl.public_id); // Implement delete logic as per Cloudinary API
      }
      throw new ApiError(400, "Failed to upload the File");
    } 
  }

  const newMessageData = {
    sender: UserID,
    message: message || "", 
    chat: chatId,
  };

  if (AttachmentUrl) {
    newMessageData.Attachments = [
      {
        public_id: AttachmentUrl.public_id,
        url: AttachmentUrl.url,
      },
    ];
  }

  // console.log("Checking Attachements", AttachmentUrl);
  // console.log("Checking URL", AttachmentUrl.url);

  // Create the new message
  const NewMessage = await Messages.create(newMessageData);

  // Update the chat with the last message ID
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    {
      $set: {
        message: NewMessage._id,
      },
    },
    {
      new: true,
    },
  );

  const MessageAggregation = await Messages.aggregate([
    {
      $match: {
        _id: NewMessage._id,
      },
    },
    ...ChatMessageCommonAggregation(),
  ]);

  const receivedMessage = MessageAggregation[0];

 
  if (!receivedMessage) {
    throw new ApiError(500, "Internal server error");
  }

  // Emit socket events as needed
  chat.members.forEach((memberId) => {
    if (memberId.toString() === req.user._id.toString()) return;

    emitSocketEvent(
      req,
      memberId.toString(),
      NEW_MESSAGE_ALERT,
      receivedMessage,
    );

    emitSocketEvent(
      req,
      memberId.toString(),
      NEW_MESSAGE,
      receivedMessage,
    );

    emitSocketEvent(
      req,
      memberId.toString(),
      REFETCH_CHATS,
      receivedMessage,
    );
  });

  console.log("receivedMessage:", receivedMessage);

 
  return res
    .status(200)
    .json(new ApiResponse(200, {  AttachmentUrl}, "Attachment sent successfully"));
});


const deleteUploadedFile = async (public_id) => {
  try {
    await cloudinary.uploader.destroy(public_id);
    console.log(`Deleted file: ${public_id}`);
  } catch (error) {
    throw new ApiError(400, "Failed to delete the uploaded file");
  }
};

const getAllMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 10 } = req.query;


  const pageNumber = parseInt(page, 10);
  const PageSize = parseInt(limit, 10);

  if (isNaN(pageNumber) || isNaN(PageSize) || pageNumber < 1 || PageSize < 1) {
    throw new ApiError(400, "Invalid page number or limit");
  }

  const selectedChat = await Chat.findById(chatId);

  if (!selectedChat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const UserID = await User.findById(req.user._id);

  // if you are not a memeber of this chat then how can you fetch the messages as somebody can read others messages
  if (!selectedChat.members.includes(req.user?._id)) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  // calculate the skip value
  const skip = (pageNumber - 1) * PageSize;

  // Get the total message count
  const totalMessage = await Messages.countDocuments({
    chat: selectedChat._id,
  });

  const messages = await Messages.aggregate([
    {
      $match: {
        chat: selectedChat._id,
      },
    },

    ...ChatMessageCommonAggregation(),

    {
      $sort: {
        updatedAt: -1,
      },
    },  
    {
      $skip: skip,
    },
    {
      $limit: PageSize,
    }, 
  ]);


  const totalPages = Math.ceil(totalMessage / PageSize);
  const hasmore = pageNumber < totalPages;

  emitSocketEvent(req, REFETCH_CHATS, messages, `Getting All Messages`);


  console.log(totalPages, "totalPages");
  console.log(totalMessage, "totalMessage");
  console.log(hasmore, "hasmore");
  console.log(pageNumber, "pageNumber");

  return res
    .status(200)
    .json( new MessageResponse(200 , messages , totalPages ,hasmore ,"Messages fetched successfully"));
}); 


// Algorithm
// 1. fetch the chatId and messageId from the request params
// 2. check if the chatId and messageId is valid or not
// 3. Check are you authorize to delete the message if you are the sender of the message
// 4.IF the message is attachment then delete the attachment from the Db
// 5.
 
const DeleteMessage = asyncHandler(async (req, res) => {
  const { chatId, messageId } = req.params;

  const chat = await Chat.findOne({
    _id: chatId,
    members: req.user._id,
  });

  if (!chat) {
    throw new ApiError(404, "Chat does not exist");
  }

  const message = await Messages.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message does not exist");
  }

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this message");
  }

  if (message.Attachments.length > 0) {
    await Messages.deleteOne({
      _id: messageId,
    });
  }

  if (chat.message.toString() === message._id.toString()) {
    const lastMessage = await Messages.findOne(
      {
        chat: chatId,
      },
      {},
      {
        sort: { createdAt: -1 },
      },
    );

    await Chat.findByIdAndUpdate(chatId, {
      message: lastMessage ? lastMessage?._id : null,
    });
  }

  // Emit socket events as needed
  chat.members.forEach((memberId) => {
    if (memberId.toString() === req.user._id.toString()) return;

    emitSocketEvent(req, memberId.toString(),MESSAGE_DELETE_EVENT, message );
  });

  return res
    .status(200)
    .json(new ApiResponse(200, message, "Message deleted successfully"));
});

// Delete the message from the Db 

export { SendMessage, getAllMessages, DeleteMessage , SendAttachmentOnly };
