import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import { initializeSocketIO } from "./Socket/index.js";
import { asyncHandler } from "./utils/asyncHandler.utils.js";
import jwt from 'jsonwebtoken';
import { User } from "./models/User.model.js";
import { ApiError } from "./utils/apiError.utils.js";

// import {createSingleChats , createGroupchats , createMessage , createMessageInChat} from "./seeders/chat.seed.js"

// createSingleChats(10)
// createGroupchats(10)
// createMessage(10)
// createMessageInChat("669c1f033ab1ef836bc1e183" , 10 )

const adminSecretKey = process.env.ADMIN_SECRET_KEY || "adsasdsdfsdfsdfd";


const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    // origin: process.env.CORS_ORIGIN,
    origin: "http://localhost:5173", // Replace with your frontend URL

    credentials: true,
  },
});

app.set("io", io); // using set method to mount the `io` instance on the app to avoid usage of `global`

app.use(
  cors({
    origin: "http://localhost:5173", // Replace with your frontend URL
    credentials: true,
  }),
);

// Data fetching configuration
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());



 
app.use((req, res, next) => {
  // console.log('All Cookies:', req.cookies);

  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken) {
    console.log('Access token not found in cookies');
  } else {
    console.log('Access token is here:');
  }

  if (!refreshToken) {
    console.log('Refresh token not found in cookies');
  } else {
    console.log('Refresh token is here:');
  }

  next();
});

  




initializeSocketIO(io);



// const emitSocketEvent = (req, roomId, event, payload) => {
//     req.app.get("io").in(roomId).emit(event, payload);
//   };

import userRouter from "./routes/user.routes.js";
import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/Message.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import adminRouter from "./routes/Admin.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/notif", notificationRouter );
app.use("/api/v1/Admin", adminRouter )

// step 1 -io.on will setup an event Listner for new client connections to the server

// io.on("connection", (socket) => {
//   console.log("A user Connected", socket.id);

//   const user = {
//     _id:"573",
//     name:"Sameer Suman"
//   }

// // step 3  The Authenticated users ID will be mapped with ther socket Id

//   userSocketIDs.set(user._id , socket.id);

//   console.log(userSocketIDs);

// //  step 4 Now scoket.on is used to listen for the events emitted by the connected client

//   socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
//     // console.log("New Message", data);

//     const MessageForRealTime = {
//       message: message,
//       _id: uuid(),
//       sender: {
//         _id: user._id,
//         name: user.name,
//       },
//       chatId,
//       createdAt: new Date().toISOString(),
//     };

//     // Step 5 save the message in DB

//     const messageForDB = {
//         message:message,
//         sender:user._id,
//         chat:chatId
//     }

//     // Step 6 Now get the List of all users from userSocketIDs to display the online clients

//     const usersSocket = getSockets(members);
//     // message will be received by the online users at first in a particular Chat
//     io.to(usersSocket).emit(NEW_MESSAGE, {
//         chatId ,
//         message: MessageForRealTime
//     })

//     // await Messages.create(messageForDB)
//     console.log("MessageForRealTime", MessageForRealTime);
//   });

//   socket.on("disconnect", () => {
//     console.log("user Disconnected");
//     userSocketIDs.delete(user._id.toString())
//   });
// });

export { httpServer, io , adminSecretKey };
