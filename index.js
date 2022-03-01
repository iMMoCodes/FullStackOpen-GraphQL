const { ApolloServer, gql, UserInputError } = require('apollo-server')
const mongoose = require('mongoose')
const { v1: uuid } = require('uuid')
require('dotenv').config()
const Book = require('./models/Book')
const Author = require('./models/Author')

const MONGODB_URI = process.env.MONGODB_URI

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    id: ID!
    genres: [String!]!
  }

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }

  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]!
    ): Book!
    addAuthor(name: String!, born: Int): Author!
    editAuthor(name: String!, setBornTo: Int!): Author
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]
    allAuthors: [Author!]!
  }
`

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      return Book.find({})
    },
    // allBooks: (root, args) => {
    //   if (!args.author && !args.genre) {
    //     return books
    //   }
    //   if (!args.genre) {
    //     return books.filter((book) => book.author === args.author)
    //   }
    //   if (!args.author) {
    //     return books.filter((book) => book.genres.includes(args.genre))
    //   }
    //   if (args.author && args.genre) {
    //     return books.filter(
    //       (book) =>
    //         book.author === args.author && book.genres.includes(args.genre)
    //     )
    //   }
    // },
    allAuthors: async (root, args) => {
      return Author.find({})
    },
  },
  // Author: {
  //   bookCount: ({ name }) =>
  //     books.filter((book) => book.author === name).length,
  // },
  Mutation: {
    addBook: async (root, args) => {
      const book = new Book({ ...args })
      try {
        await book.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return book
    },
    addAuthor: async (root, args) => {
      const author = new Author({ ...args })
      try {
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return author
    },
    // editAuthor: (root, args) => {
    //   const author = authors.find((author) => author.name === args.name)
    //   if (!author) {
    //     return null
    //   }
    //   const updatedAuthor = { ...author, born: args.setBornTo }
    //   authors = authors.map((author) =>
    //     author.name === args.name ? updatedAuthor : author
    //   )
    //   return updatedAuthor
    // },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})
