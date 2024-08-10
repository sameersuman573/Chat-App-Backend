import mongoose, { Schema } from "mongoose";
import { z } from "zod";

const chatSchema = new Schema(
  {
    name: {
      type: String,
       unique: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref:"User",
         default: [],
      },
    ],

    groupChat: {
      type: Boolean,
      default: false,
    },

    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
     },

    message: [
      {
        type: Schema.Types.ObjectId,
        ref: "Messages",
      },
    ],
  },
  { timestamps: true },
);

export const Chat = mongoose.model("Chat", chatSchema);
