const multer = require("multer");
const appError = require("../controllers/error.js").appError;
const asyncHandler = require("express-async-handler");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const imageFilter = function (req, file, cb) {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
    return cb(new appError("Allow only jpeg, jpg and png", 400), false);
  }
  cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter }).single(
  "image"
);
module.exports = asyncHandler(async (req, res, next) => {
  upload(req, res, async function (err) {
    if(!req.isAuth) return next(new appError("Unauthenticated!", 401));
    if (err) return next(new appError(err, 422));
    if (!req.file) return res.status(200).json({ message: "No image provided." });
    
    const image = await cloudinary.uploader.upload(req.file.path);
    if (!image) return next(new appError("Error uploading image.", 422));
    return res.status(200).json({
      message: "Image uploaded successfully.",
      image: { imageUrl: image.secure_url, _id: image.public_id },
    });
  });
});
