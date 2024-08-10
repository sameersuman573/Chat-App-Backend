import { User } from "../models/User.model.js";
import { faker , simpleFaker } from "@faker-js/faker";
import { Chat } from "../models/Chat.model.js";
import { Messages } from "../models/Message.model.js";
// const createdChat = async(numUsers) => {

//     try {
//         const usersPromise = []

//         for( let i=0; i<numUsers; i++){
//             const tempUser = User.create({

//                 name: faker.animal.name(),
//                 admin: faker.admin.admin(),
//                 message: faker.message.message(),
//                  avatar: faker.image.avatar()

//             })

//             usersPromise.push(tempUser)
//         }

//         await Promise.all(usersPromise)

//         console.log("Chats Created Successfully" , numUsers);
//         process.exit(1)

//     } catch (error) {
//         console.error(error)
//         process.exit(1)
//     }
// }

const createSingleChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");

    const chatsPromise = [];

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        chatsPromise.push(
          Chat.create({
            name: faker.lorem.words(2),
            members: [users[i]._id, users[j]._id],
            groupChat: false,
            admin: users[i]._id,
          }),
        );
      }
    }

    await Promise.all(chatsPromise);
    console.log("Chats Created Successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const createGroupchats = async (numChats) => {
  try {
    const users = await User.find().select("_id");

    const chatsPromise = [];

    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });
      const members = [];

      for (let i = 0; i < numMembers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        // Ensure the same user is not added twice
        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }


let chatname ;
let isUnique = false;
while(!isUnique){
  chatname = faker.lorem.words(2);
const existingChat = await Chat.findOne({name:chatname});

if(!existingChat){
  isUnique = true;
}
}

      const chat = Chat.create({
        groupChat: true,
        name: chatname,
        members,
        admin: members[0],
      });

      chatsPromise.push(chat);
    }

    await Promise.all(chatsPromise);

    console.log("Chats created successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};


const createMessage = async (numMessage) => {
  try {
    const users = await User.find().select("_id");
    const chats = await Chat.find().select("_id");

    const messagePromise = [];

    for (let i = 0; i < numMessage; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)]._id;
      const randomChat = chats[Math.floor(Math.random() * chats.length)]._id;

      messagePromise.push(
        Messages.create({
          sender: randomUser,
          chat: randomChat,
          message: faker.lorem.sentence(), // Updated to use faker.lorem.sentence() for message content
          attachment: faker.image.avatar(),
        }),
      );
    }

    await Promise.all(messagePromise);

    console.log("Messages Created Successfully");
    process.exit(1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

const createMessageInChat = async (chatId, numMessage) => {
  try {
    const users = await User.find().select("_id");

    const messagePromise = [];

    for (let i = 0; i < numMessage; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];

      messagePromise.push(
        Messages.create({
          sender: randomUser,
          chat: chatId,
          message: faker.lorem.sentence(), // Updated to use faker.lorem.sentence() for message content
          attachment: faker.image.avatar(),
        }),
      );
    }

    await Promise.all(messagePromise);
    console.log("Messages Created Successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// createUser(10) // Change the number of users to create
export {
  createSingleChats,
  createMessage,
  createMessageInChat,
  createGroupchats,
};
