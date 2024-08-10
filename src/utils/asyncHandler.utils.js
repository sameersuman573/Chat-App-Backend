
// In this we will create a method and just will export it
// we are making a WRAPPER FUNCTION

// 2 ways of writing 
// # promises - prefer 
// # try and catch 


// In this we are creating a higher order function where we are accepting as a function as well as returning as a function 


const asyncHandler = (requestHandler) => {
  return (req , res , next) => {
       Promise.resolve(requestHandler(req , res , next))
       .catch((err) => next(err))
       // Promise.resolve().catch() -> just add callbacks in each part   

       // for Standeriaztion of api error and api response - read documentataion node.js api error 
   }
}


export {asyncHandler}





// Try catch approach

// Making it a higher order function - a function which take its parameter a function 
// const asyncHandler = (fn) => {() => {}}


// const asyncHandler = (fn) => async(req , res , next) => {
//     try {
//         await fn(req , res , next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             Message: err.Message
//         })
//     }
// }












