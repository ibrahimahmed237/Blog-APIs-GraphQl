const { buildSchema } = require("graphql");
module.exports = buildSchema(`
    input imageData {
        imageUrl: String!
        _id: String!
    }
    type imageDataOutput {
        imageUrl: String!
        _id: String!
    }
    type Post {
        _id: ID!
        title: String!
        content: String!
        image: imageDataOutput!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }
    
    type User {
        _id: ID!
        email: String!
        name: String!
        password: String
        status: String!
        posts: [Post!]!
    }
    input UserInputData {
        email: String!
        name: String!
        password: String
    }
    type AuthData {
        token: String!
        userId: String!
    }
    input PostInputData {
        title: String!
        content: String!
        image: imageData!
    }
    type rootMutation {
        createUser(userInput: UserInputData!): User!
        login(email: String!, password: String!): AuthData!
        createPost(postInput: PostInputData): Post!
        updatePost(id: ID!, postInput: PostInputData): Post!
        deletePost(id: ID!): Boolean!
        updateStatus(status: String!): User!
    } 
    type PostData {
        posts: [Post!]!
        totalPosts: Int!
    }
    type rootQuery {
        posts(page:Int!): PostData!
        status: String!
        post(id: ID!): Post!
        logout(token:String!): Boolean!
    }
    
    schema {
        query: rootQuery
        mutation: rootMutation,
    }
`);
