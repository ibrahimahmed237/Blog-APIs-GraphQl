const jwt = require("jsonwebtoken");
const User = require("../models/User");
const appError = require("../controllers/error.js").appError;
const asyncHandler = require("express-async-handler");

module.exports = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    req.isAuth = false;
    return next();
  }

  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  const user = await User.findOne({
    _id: decodedToken.userId,
    "tokens.token": token,
  });
  if (!user) {
    req.isAuth = false;
    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
});
