"use strict";

module.exports = (error) => {
  let errors=[];
  for (let item of error.details) {
    item.message = item.message.replace(/"/g, "");
    item.message = item.message.concat(".");
    errors.push(item.message);
  }
  return errors;
};
