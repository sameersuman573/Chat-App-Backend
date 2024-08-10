


        // Super keyword - It is called when extend keyword is used to create a subclass.
        // It is called inside the constructor of the subclass
        // To call the constructor of the parent class
        // This is because the subclass must initialize the parent class before it uses this keyword
        // super keyword is basically used to overide the parent class constructor 

        class ApiError extends Error{
            constructor(
                statusCode,
                message="Something went wrong ",
                errors = [],
                stack = "",
                // error stack
                )
                {
                    super(message)
                    // mesaage overide is compulsory 
        
                    this.statusCode = statusCode
                    this.data = null
                    this.message = message
                    this.success = false;
                    this.errors = errors
        
                    // do log
                    if(stack){
                        // stack gives the error in which files it is occuring
                        this.stack = stack
                     }
                    else{
                        Error.captureStackTrace(this , this.constructor)
                    }
                }
        }
        
        export {ApiError}