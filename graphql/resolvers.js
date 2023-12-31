const userValidator = require("../validation/user.js");
const postValidator = require("../validation/post.js");
const appError = require("../error-handling/error.js").appError;
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Post = require("../models/Post");
const asyncHandler = require("express-async-handler");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = {
  createUser: asyncHandler(async function ({ userInput }, req) {
    let user = {
      email: userInput.email,
      password: userInput.password,
      name: userInput.name,
    };
    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) return new appError("User exists already!", 422);

    const { error, value } = userValidator(user);
    if (error) return new appError(error, 422);

    const hashedPassword = await bcrypt.hash(value.password, 12);
    user = new User({
      email: value.email,
      password: hashedPassword,
      name: value.name,
    });

    await user.save();
    return { ...user._doc, _id: user._id.toString() };
  }),
  login: asyncHandler(async function ({ email, password }, req) {
    const user = await User.findOne({ email });
    if (!user) return new appError("Invalid email or password", 401);

    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) return new appError("Invalid email or password", 401);

    const token = await user.generateAuthToken();
    return { token, userId: user._id.toString() };
  }),
  createPost: asyncHandler(async function ({ postInput }, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const user = await User.findById(req.userId);
    if (!user) return new appError("Invalid user.", 404);
    let post = new Post({
      title: postInput.title,
      content: postInput.content,
      image: {
        imageUrl: postInput.image.imageUrl,
        _id: postInput.image._id,
      },
      creator: user,
    });
    const { error, value } = postValidator(post);
    if (error) {
      await cloudinary.uploader.destroy(postInput.image._id);
      return new appError("Invalid Validation.", 422);
    }
    if (!postInput.image) return new appError("Error uploading image.", 422);
    post = {
      title: value.title,
      content: value.content,
      image: {
        imageUrl: postInput.image.imageUrl,
        _id: postInput.image._id,
      },
      creator: req.userId,
    };

    const createdPost = await Post.create(post);
    user.posts.push(createdPost);
    await user.save();
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      creator: { ...user._doc, _id: user._id.toString() },
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  }),
  posts: asyncHandler(async function (args, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    let page = args.page;
    if (!page) page = 1;
    const perPage = 2;
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");

    return {
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts: await Post.countDocuments(),
    };
  }),
  post: asyncHandler(async function ({ id }, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const post = await Post.findById(id).populate("creator");
    if (!post) return new appError("No post found!", 404);
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }),
  status: asyncHandler(async function (args, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const user = await User.findById(req.userId);
    if (!user) return new appError("Invalid user.", 404);
    return user.status.toString();
  }),
  updatePost: asyncHandler(async function ({ id, postInput }, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const post = await Post.findById(id).populate("creator");
    if (!post) return new appError("No post found!", 404);
    if (post.creator._id.toString() !== req.userId.toString())
      return new appError("Not authorized!", 403);

    const { error, value } = postValidator(postInput);
    if (error) {
      await cloudinary.uploader.destroy(postInput.image._id);
      return new appError(error, 422);
    }
    post.title = value.title;
    post.content = value.content;
    if (postInput.image._id.toString() !== "UNDEFINED") {
      await cloudinary.uploader.destroy(post.image._id);
      post.image = {
        imageUrl: postInput.image.imageUrl,
        _id: postInput.image._id,
      };
    }
    await post.save();
    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }),
  deletePost: asyncHandler(async function ({ id }, req) {
    const post = await Post.findById(id);
    if (!post) return new appError("No post found!", 404);
    if (post.creator.toString() !== req.userId.toString())
      return new appError("Not authorized!", 403);

    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    await cloudinary.uploader.destroy(post.image._id);
    await Post.findByIdAndDelete(post._id);
    return true;
  }),

  updateStatus: asyncHandler(async function ({ status }, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const user = await User.findById(req.userId);
    if (!user) return new appError("Invalid user.", 404);
    user.status = status;
    await user.save();
    return {
      ...user._doc,
      _id: user._id.toString(),
    };
  }),

  logout: asyncHandler(async function ({ token }, req) {
    if (!req.isAuth) return new appError("Unauthenticated!", 401);
    const user = await User.findById(req.userId);
    if (!user) return new appError("Invalid user.", 404);

    user.tokens = user.tokens.filter((tokens) => {
      return tokens.token !== token;
    });
    await user.save();
    return true;
  }),
};
