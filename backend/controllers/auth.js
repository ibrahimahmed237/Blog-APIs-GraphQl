const User = require("../models/User");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const appError = require("../controllers/error.js").appError;
const validateUser = require("../validation/user.js");

exports.signup = asyncHandler(async (req, res, next) => {
  const { value, error } = validateUser(req.body);
  if (error) {
    return res.status(422).json({
      message: "Validation failed, entered data is incorrect.",
      errors: error,
    });
  }

  const existingUser = await User.findOne({ email: value.email });
  if (existingUser) {
    return next(new appError("User exists already!", 422));
  }

  const hashedPassword = await bcrypt.hash(value.password, 12);

  const user = new User({
    email: value.email,
    password: hashedPassword,
    name: value.name,
  });

  await user.save();

  return res.status(201).json({
    message: "User created successfully!",
    user,
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new appError("Invalid email or password!", 401));
  }

  const isPassEqual = await bcrypt.compare(password, user.password);
  if (!isPassEqual)
    return next(new appError("Invalid email or password!", 401));

  const token = await user.generateAuthToken();

  return res.status(200).json({
    message: "Logged in successfully!",
    token,
    userId: user._id.toString(),
  });
});

exports.logout = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user) return next(new appError("Please Authenticate.", 422));

  const deletedToken = req.header("Authorization")?.replace("Bearer ", "");

  user.tokens = user.tokens.filter((tokens) => {
    return tokens.token !== deletedToken;
  });

  await user.save();
  res.status(200).send();
});

exports.getStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.userId);
  if (!user) return next(new appError("Please Authenticate.", 422));

  return res.status(200).json({
    message: "Status fetched successfully!",
    status: user.status,
  });
});

exports.updateStatus = asyncHandler(async (req, res, next) => {
  let status = req.body.status;
  status = status.trim();
  if (!status) return next(new appError("Status cannot be empty!", 422));

  const user = await User.findById(req.userId);
  if (!user) return next(new appError("Please Authenticate.", 422));
  user.status = status;

  await user.save();
  return res.status(200).json({
    message: "Status updated successfully!",
  });
});
