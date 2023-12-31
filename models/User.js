const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Schema = mongoose.Schema;
const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "I am new!",
    },
    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    tokens: [
      {
        token: {
          type: String,
          required: true,
        }
      },
    ],
  },
  { timestamps: true }
);
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokens;
  return obj;
};

userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign(
    { email: this.email, userId: this._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
  this.tokens = this.tokens.concat({ token });
  await this.save();
  return token;
};

module.exports = mongoose.model("User", userSchema);
