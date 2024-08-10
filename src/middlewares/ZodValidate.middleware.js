

import {z} from "zod"

 const zodValidation = (zodSchema) => {
    return async (req , res , next) => {

        try {
            zodSchema.parse(req.body)
            next()
        } catch (error) {
            res.status(400).json({ error: error.errors})
        }
    }
 }

 export {zodValidation}