import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
     },

    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
     },

    message: {
      type: String,
    },

    Attachments: [
      {
        public_id: {
          type: String,
          // required: true,
        },

        url: {
          type: String,
          // required: true,
        },
      },
    ],
  },
  { timestamps: true },
);

export const Messages = mongoose.model("Messages", MessageSchema);
