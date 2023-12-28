const joi = require("joi");
const validationError = require("./validationError.js");

module.exports = (user) => {
  const userSchema = joi
    .object({
      email: joi.string().email().required(),
      password: joi.string().min(6).required(),
      name: joi
        .string()
        .required()
        .regex(/^[a-zA-Z\s]+$/)
        .min(3)
        .max(30),
    })
    .unknown();
  let { error, value } = userSchema.validate(user);
  if (error) error = validationError(error);

  return { value, error };
};
