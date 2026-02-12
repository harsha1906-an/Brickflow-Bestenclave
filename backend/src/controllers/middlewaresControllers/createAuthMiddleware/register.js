const Joi = require('joi');
const mongoose = require('mongoose');
const { generate: uniqueId } = require('shortid');

const register = async (req, res, { userModel }) => {
  const UserPasswordModel = mongoose.model(userModel + 'Password');
  const UserModel = mongoose.model(userModel);
  const { email, password, name, role } = req.body;

  // validate
  const objectSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: true } })
      .required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    role: Joi.string().valid('owner', 'manager').required(),
  });

  const { error, value } = objectSchema.validate({ email, password, name, role });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid/Missing credentials.',
      errorMessage: error.message,
    });
  }

  const existingUser = await UserModel.findOne({ email: email, removed: false });

  if (existingUser)
    return res.status(409).json({
      success: false,
      result: null,
      message: 'An account with this email already exists.',
    });

  const newUser = new UserModel({
    email,
    name,
    role,
    enabled: true,
  });
  
  const savedUser = await newUser.save();

  const salt = uniqueId();
  const newUserPassword = new UserPasswordModel();
  const passwordHash = newUserPassword.generateHash(salt, password);

  const passwordEntry = new UserPasswordModel({
      user: savedUser._id,
      password: passwordHash,
      salt: salt,
      emailVerified: true 
  });
  
  await passwordEntry.save();

  return res.status(200).json({
      success: true,
      result: {
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role
      },
      message: 'Account created successfully',
  });
};

module.exports = register;
