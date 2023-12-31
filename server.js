const mongoose = require("mongoose");
const appError = require("./controllers/error.js").appError;
const app = require("./app.js");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then((res) => {
    const server = app.listen(process.env.PORT || 8080, () => {
      console.log(
        `Connected to database and server is running on port ${
          process.env.PORT || 8080
        }.`
      );
    });
  })
  .catch((err) => {
    new appError("Something went wrong, try later.", 500);
  });

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
