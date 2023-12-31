const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const postSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
    },
    content: {
      type: String,
      required: [true, "Content is required."],
    },
    image: {
      type: {
        imageUrl: {
          type: String,
          required: true,
        },
        _id: {
          type: String,
          required: true,
        },
      },
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required."],
    },
  },
  { timestamps: true }
);
postSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.image._id;
  return obj;
};
module.exports = mongoose.model("Post", postSchema);
