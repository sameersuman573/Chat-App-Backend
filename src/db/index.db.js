
import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const ConnectDB = async() => {

    try {
        const ConnectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("MONGODB IS CONNECTED SUCCESSFULLY", ConnectionInstance.connection.host);
        
    } catch (error) {
        console.log("Problem in connecting to the databse" , error);
        process.exit(1);
    }
}

export default ConnectDB;