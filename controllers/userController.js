const User = require('../models/user');

const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');

exports.index = asyncHandler(async (req, res, next) => {
  const numUsers = await User.countDocuments({}).exec();

  res.render('base', {
    block_content: 'index',
    title: "User Authentication",
    user_count: numUsers,
  });
});

exports.sign_up_get = asyncHandler(async (req, res, next) => {
  res.render('base', {
    block_content: 'sign_up_form',
    title: "Create New User",
    errors: undefined,
  });
});

exports.sign_up_post = [
  body("username", "Username must not be empty.")
    .trim()
    .isLength({ min: 1 }),
  body("password", "Password must be at least 5 characters")
    .trim()
    .isLength({ min: 5 }),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req)

    const user = new User({
      username: req.body.username,
      password: req.body.password,
    });

    const userExists = await User.findOne({ username: req.body.username }).collation({ locale: "en", strength: 2 }).exec();

    if (userExists) {
      errors.push("Username is taken");
    }

    if (!errors.isEmpty()) {
      res.render('base', {
        block_content: 'sign_up_form',
        title: "Create New User",
        errors: errors.array(),
      });
      return;
    } else {
      await user.save();
      res.redirect("/users")
    }
  }),
];