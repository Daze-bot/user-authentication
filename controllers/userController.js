const User = require('../models/user');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ name_lower: username.toLowerCase() });
      if (!user) {
        return done(null, false, { message: "User not found" });
      };
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return done(null, false, { message: "Incorrect password" });
      };
      return done(null, user);
    } catch(err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch(err) {
    done(err);
  }
});

exports.index = asyncHandler(async (req, res, next) => {
  const numUsers = await User.countDocuments({}).exec();

  res.render('base', {
    block_content: 'index',
    title: "User Authentication",
    user_count: numUsers,
    user: res.locals.currentUser,
  });
});

exports.sign_up_get = asyncHandler(async (req, res, next) => {
  res.render('base', {
    block_content: 'sign_up_form',
    title: "Create New User",
    errors: undefined,
    username: "",
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
    const errors = [];

    const userExists = await User.findOne({ name_lower: req.body.username.toLowerCase() }).collation({ locale: "en", strength: 2 }).exec();

    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }
      const user = new User({
        username: req.body.username,
        password: hashedPassword,
        name_lower: req.body.username.toLowerCase(),
      });
  
      const validationErrors = validationResult(req).array();
  
      if (userExists) {
        errors.push("Username already in use. Please choose a new name");
        user.username = "";
      } else {  
        validationErrors.forEach(err => {
          errors.push(err.msg);
        });
      }
  
      if (errors.length > 0) {
        res.render('base', {
          block_content: 'sign_up_form',
          title: "Create New User",
          errors: errors,
          username: user.username
        });
        return;
      } else {
        await user.save();
        req.login(user, (err) => {
          if (err) {
            return next(err);
          }
          res.redirect("/users")
        });
      }
    });
  }),
];

exports.log_in_get = asyncHandler(async (req, res, next) => {
  res.render('base', {
    block_content: 'log_in_form',
    title: "Log In",
    errors: undefined,
    username: "",
  });
});

exports.log_in_post = [
  body("username", "Please enter username")
    .trim()
    .isLength({ min: 1 }),
  body("password", "Please enter password")
    .trim()
    .isLength({ min: 1 }),

  asyncHandler(async (req, res, next) => {
    const errors = [];

    const validationErrors = validationResult(req).array();

    validationErrors.forEach(err => {
      errors.push(err.msg);
    });

    if (errors.length > 0) {
      res.render('base', {
        block_content: 'log_in_form',
        title: "Log In",
        errors: errors,
        username: req.body.username,
      });
    } else {
      passport.authenticate('local', (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          errors.push(info.message);
          res.render('base', {
            block_content: 'log_in_form',
            title: "Log In",
            errors: errors,
            username: req.body.username,
          });
        } else {
          req.login(user, (err) => {
            if (err) {
              return next(err);
            }
            res.redirect("/users")
          });
        }
      })(req, res, next);
    }
  }),
];

exports.log_out_get = asyncHandler(async (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/users");
  });
});