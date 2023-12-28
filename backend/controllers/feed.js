const validatePost = require("../validation/post.js");
const Post = require("../models/Post.js");
const uploadPostImage = require("../middlewares/uploadSingleImage.js");
const appError = require("../controllers/error.js").appError;
const asyncHandler = require("express-async-handler");
const User = require("../models/User.js");
const io = require("../socket.js").getIO;
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.getPosts = asyncHandler(async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  const totalItems = await Post.find().countDocuments();

  const posts = await Post.find({})
    .populate("creator")
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * perPage)
    .limit(perPage);
  if (!posts) return next(new appError("Could not find posts.", 422));

  return res.status(200).json({
    message: "Fetched posts successfully.",
    posts: posts,
    totalItems,
  });
});

exports.createPost = asyncHandler(async (req, res, next) => {
  uploadPostImage(req, res, async function (err) {
    if (err) return next(new appError(err, 422));
    const { value, error } = validatePost(req.body);
    if (error) {
      return res.status(422).json({
        message: "Validation failed, entered data is incorrect.",
        errors: error,
      });
    }

    if (!req.file) {
      return next(new appError("No image provided!", 422));
    }

    const image = await cloudinary.uploader.upload(req.file.path);

    const user = await User.findById(req.userId);
    if (!user) return next(new appError("Please Authenticate.", 422));

    const post = new Post({
      title: value.title,
      content: value.content,
      image: { imageUrl: image.secure_url, _id: image.public_id },
      creator: req.userId,
    });

    await post.save();
    user.posts.push(post);
    await user.save();

    io().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });

    return res.status(200).json({
      message: "Post created successfully!",
      post,
      creator: { _id: user._id, name: user.name },
    });
  });
});

exports.getPost = asyncHandler(async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId);
  if (!post) {
    const error = new appError("Could not find post.");
    return next(error, 422);
  }
  return res.status(200).json({
    message: "Post fetched.",
    post: post,
  });
});

exports.updatePost = asyncHandler(async (req, res, next) => {
  uploadPostImage(req, res, async function (err) {
    if (err) return next(new appError(err, 422));

    const { value, error } = validatePost(req.body);
    if (error) {
      return res.status(422).json({
        message: "Validation failed, entered data is incorrect.",
        errors: error,
      });
    }

    const postId = req.params.postId;
    const post = await Post.findById(postId).populate("creator");

    if (!post) return next(new appError("Could not find post."), 422);

    if (post.creator._id.toString() !== req.userId) {
      return next(new appError("Not authorized!", 403));
    }

    post.title = value.title;
    post.content = value.content;

    if (req.file) {
      const image = await cloudinary.uploader.upload(req.file.path);
      await cloudinary.uploader.destroy(post.image._id);
      post.image.imageUrl = image.secure_url;
      post.image._id = image.public_id;
    }
    await post.save();
    io().emit("posts", { action: "update", post: post });
    return res.status(200).json({
      message: "Post updated successfully!",
      post: post,
    });
  });
});

exports.deletePost = asyncHandler(async (req, res, next) => {
  const postId = req.params.postId;
  const post = await Post.findById(postId).populate("creator");
  if (!post) return next(new appError("Could not find post."), 422);

  if (post.creator._id.toString() !== req.userId) {
    return next(new appError("Not authorized!", 403));
  }
  const user = await User.findById(req.userId);

  if (!user) return next(new appError("Please Authenticate.", 422));
  user.posts.pull(postId);
  await user.save();

  await cloudinary.uploader.destroy(post.image._id);
  await Post.findByIdAndDelete(postId);
  io().emit("posts", { action: "delete", post: postId });
  return res.status(200).json({
    message: "Post deleted successfully!",
  });
});