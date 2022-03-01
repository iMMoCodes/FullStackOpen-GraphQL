const { UserInputError, AuthenticationError } = require('apollo-server')
const { PubSub } = require('graphql-subscriptions')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const Book = require('./models/Book')
const Author = require('./models/Author')
const User = require('./models/User')
const pubsub = new PubSub()

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      if (!args.author && !args.genre) {
        return Book.find({}).populate('author')
      }
      if (!args.genre) {
        return Book.find({ author: args.author }).populate('author')
      }
      if (!args.author) {
        return Book.find({ genres: { $in: [args.genre] } }).populate('author')
      }
      if (args.author && args.genre) {
        return Book.find({
          author: args.author,
          genres: { $in: [args.genre] },
        }).populate('author')
      }
    },
    allAuthors: async (root, args) => {
      return Author.find({})
    },
    me: (root, args, context) => {
      return context.currentUser
    },
  },
  Author: {
    bookCount: async ({ _id: id }) => {
      return Book.collection.countDocuments({ author: id })
    },
  },
  Mutation: {
    addBook: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('not authenticated')
      }
      try {
        let author = await Author.findOne({ name: args.author })
        if (!author) {
          author = new Author({ name: args.author })
          await author.save()
        }
        const book = new Book({ ...args, author: author._id.toString() })
        await book.save()
        pubsub.publish('BOOK_ADDED', { bookAdded: book.populate('author') })
        return book.populate('author')
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
    },
    editAuthor: async (root, args, { currentUser }) => {
      const author = await Author.findOne({ name: args.name })
      if (!currentUser) {
        throw new AuthenticationError('not authenticated')
      }
      author.born = args.setBornTo
      try {
        await author.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return author
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })
      return user.save().catch((error) => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      })
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
      if (!user || args.password !== 'secret') {
        throw new UserInputError('wrong credentials')
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) }
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
}

module.exports = resolvers
