import ConnectDB from "./db/index.db.js";
import dotenv from "dotenv";
import { httpServer } from "./app.js"; 
dotenv.config({
  path: "./.env",
});

// global way to listen to error before the app listens
// app.on("error", (err) => {
//     console.log("The app has error before the app listens the port", err);
//   });
  
// Basic syntax to connect to the database and listen to the port
// ConnectDB().then().catch()

ConnectDB()
  .then(() => {
    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`server is running at PORT ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("MONGODB CONNECTION FAILURE !!!!", err);
  });
