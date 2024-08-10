import { User } from "../models/User.model.js"
import {faker} from "@faker-js/faker"

const createUser = async(numUsers) => {

    try {
        const usersPromise = []

        for( let i=0; i<numUsers; i++){
            const tempUser = User.create({
                fullname: faker.person.fullName(),
                username: faker.internet.userName(),
                email: faker.internet.email(),
                password: 12345,
                avatar: faker.image.avatar()
            })

            usersPromise.push(tempUser)
        }

        await Promise.all(usersPromise)

        console.log("Users Created Successfully" , numUsers);
        process.exit(1)

    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}

// createUser(10) // Change the number of users to create
export {createUser}