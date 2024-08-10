
class ApiResponse {
    constructor(statusCode , data , message="Success"){
        // This refers to the newly created object instance
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.Success = statusCode<400
    }
}


class MessageResponse {
    constructor(statusCode , data , totalPages , hasmore, message="Success"){
        // This refers to the newly created object instance
        this.statusCode = statusCode
        this.data = data
        this.totalPages = totalPages
        this.hasmore = hasmore
        this.message = message
        this.Success = statusCode<400
    }
}

export {ApiResponse , MessageResponse}