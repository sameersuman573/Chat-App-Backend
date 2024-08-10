import { Server, Socket } from "socket.io";
import {
  ALERT,
  REFETCH_CHATS,
  NEW_ATTACHMENT,
  NEW_MESSAGE_ALERT,
  NEW_REQUEST,
  NEW_MESSAGE,
  START_TYPING,
  STOP_TYPING,
  CHAT_JOINED,
  CHAT_LEAVED,
  ONLINE_USERS,
  SOCKET_ERROR_EVENT,
  CONNECTED_EVENT,
  DISCONNECT_EVENT,
  TESTING_MESSAGE,
} from "../constants.js";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { User } from "../models/User.model.js";
import { ApiError } from "../utils/apiError.utils.js";
import { v4 as uuid } from "uuid";
// import { getSockets} from "../lib/helper.js"
import { Messages } from "../models/Message.model.js";
import { Chat } from "../models/Chat.model.js";

const onlineUsers = new Map();

const getOnlineUSers = () => {
  return Array.from(onlineUsers.keys());
};

// const mountJoinChatEvent = (socket) => {
//   socket.on(CHAT_JOINED, (chatId) => {
//     console.log(`User joined the chat 🤝. chatId: `, chatId);
//     // joining the room with the chatId will allow specific events to be fired where we don't bother about the users like typing events
//     // E.g. When user types we don't want to emit that event to specific participant.
//     // We want to just emit that to the chat where the typing is happening
//     socket.join(chatId);
//   });
// };

 

 

const initializeSocketIO = (io) => {
  return io.on("connection", async (socket) => {
    try {
      console.log("New connection established");

      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

      let token = cookies?.accessToken;

      if (!token) {
        token = socket.handshake.auth?.token;
      }

      if (!token) {
        console.error("No token found. User not authenticated.");
        socket.emit(SOCKET_ERROR_EVENT, "User not authenticated");
        return;
      }

      let decodedToken;
      try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      } catch (err) {
        console.error("Token verification failed:", err);
        socket.emit(SOCKET_ERROR_EVENT, "Invalid token");
        return;
      }

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken",
      );

      if (!user) {
        console.error("User not found for the token ID");
        socket.emit(SOCKET_ERROR_EVENT, "User not found");
        return;
      }

      socket.user = user;
      console.log("User assigned to socket:", user);

      // console.log(" All this is working fine");
      // console.log("Checking the user", user);
      // console.log("Checking the user ID", user._id.toString());
      // console.log("Checking the user expermient", user._id);
      // console.log("Checking the socket ID", socket.id);

      onlineUsers.set(user._id.toString(), socket.id);

      console.log(
        "Checking the online users:",
        Array.from(onlineUsers.entries()),
      );

      // console.log("mapping the online users", onlineUsers);

      //  LOGIC - WebSockets
      // 1. When a user send or emit a message from FRONTEND then it is received here with evenet name NEW_MESSAGE
      // 2. The Backend processess the requests and save it i DB
      // 3. Now when backend emits the message NEW_MESSAGE_ALERT then it is send to all the clients in the chat room
      // This Way communication happens between the clients and the server

      // socket.on || socket.emit
      // It is used for handling events and communication on a pre_connection basis. It is useful for Client or Server client Communication

      // io.on || io.emit
      // It is used for handling events and broadcasting across all connection . It is useful for global events like new user connected or disconnected

      // MESSAGE TESTING
      socket.on(NEW_MESSAGE, async ({ chatId, message }) => {
        try {

          const chat = await Chat.findById(chatId);

          if( !chat){
            throw new ApiError(404, "Chat not found")
          }

 
           const messageForRealTime = {
            message: message,
            _id: uuid(),
            sender: {
              _id: user._id,
              username: user.username,
            },
            chat: chatId,
            // createdAt: new Date().toISOString(),
          };


          chat.members.forEach((memberId) => {
            io.to(memberId.toString()).emit(NEW_MESSAGE , {
              chat: chatId,
              ...messageForRealTime,
            });
          });



          console.log("Emitting message for the real Time", messageForRealTime);

          
          // io.to(membersSocket).emit(NEW_MESSAGE, {
          //   chatId,
          //   message: messageForRealTime,
          // });

          // io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });


        } catch (error) {
          console.log("Error in NEW_MESSAGE handler:", error);
        }
      });


      io.emit(ONLINE_USERS, getOnlineUSers());
      // const onlineUsers = getOnlineUSers();
      // console.log("Current online users:", onlineUsers);

      socket.join(user._id.toString());
      socket.emit(CONNECTED_EVENT);
      console.log("User connected 🗼. userId: ", user._id.toString());



// Assuming you have access to express and socket.io in your socket server

socket.on(START_TYPING,  ({ chatId , members}) => {
  console.log("Start Typing in the backend" , members , chatId);


  // Emiiting on Frontend
  const membersSocket = members
  .map((memberId) => onlineUsers.get(memberId.toString()))
  .filter(Boolean);

  console.log("Checking Members socket", membersSocket);
  socket.to(membersSocket).emit(START_TYPING , {chatId})
  
  });



socket.on(STOP_TYPING,  ({ chatId , members}) => {
  console.log("Stop Typing in the backend" , members , chatId);

  // Emiiting on Frontend
  const membersSocket = members
  .map((memberId) => onlineUsers.get(memberId.toString()))
  .filter(Boolean);

  console.log("Checking Members socket", membersSocket);
  socket.to(membersSocket).emit(STOP_TYPING , {chatId})
  });

 
  socket.on(CHAT_JOINED , ({userId , members}) => {
    console.log("chat Joined", userId);
  })


  socket.on(CHAT_LEAVED , ({userId, members}) => {
    console.log("chat Joined", userId);

  })







      //   Common Events that needs to be mounted on the initialization
      // mountJoinChatEvent(socket);
      // console.log("Join Chat Event Mounted");
      // mountParticipantTypingEvent(socket);
      // console.log("Participant Typing Event Mounted");
      // mountParticipantStoppedTypingEvent(socket);

      socket.on(TESTING_MESSAGE, ({ chatId, message }) => {
        console.log(`Received message for chat ${chatId}: ${message}`);
        // Emit the message to clients in the specific chat room
        socket.to(chatId).emit(TESTING_MESSAGE, message);
      });

      //   Disconnect Event
      socket.on("DISCONNECT_EVENT", () => {
        console.log("User has disconnected 🚫. userId: " + socket.user?._id);

        if (socket?.user?.id) {
          socket.leave(socket.user._id);
          onlineUsers.delete(socket.user._id.toString());

          io.emit(ONLINE_USERS, getOnlineUSers());
        }
      });
    } catch (error) {
      socket.emit(
        SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket",
      );
    }
  });
};

const emitSocketEvent = (req, roomId, event, payload) => {
  console.log(
    `Emitting event: ${event} to room: ${roomId} with payload:`,
    payload,
  );
  req.app.get("io").in(roomId).emit(event, payload);
};

// req is used to get the io instance . we have created server and while  setiing up server we have we have stored the socketIo instance in the Express app object for easy access
// RoomID specifies the chatID where event is taking place
// socket.to(chatId).emit(TESTING_MESSAGE, message);
// socket.in(chatId).emit(START_TYPING, chatId);

// To and in boradcast the messag to all the clients in the Chat Room but
// To Exclude the sender
// in include the sender - used for noftification so that it is visible to everybody

export { initializeSocketIO, emitSocketEvent };
