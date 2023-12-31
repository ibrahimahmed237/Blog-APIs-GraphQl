const express = require("express");
const app = express();
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const errorHandler = require("./controllers/error.js");
const appError = require("./controllers/error.js").appError;
const { graphqlHTTP } = require("express-graphql");
const isAuth = require("./middlewares/is-auth.js");
const uploadSingleImage = require("./middlewares/uploadSingleImage.js")

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});


app.use(isAuth);

app.put("/post-image", uploadSingleImage);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: require("./graphql/schema.js"),
    rootValue: require("./graphql/resolvers.js"),
    graphiql: true,
    customFormatErrorFn: (err) => {
      if (!err.originalError) return err;
      const data = err.originalError.message || null;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

app.all("*", (req, res, next) => {
  return next(
    new appError(`Can't find ${req.originalUrl} on this server!`, 404)
  );
});

app.use(errorHandler);

module.exports = app;
