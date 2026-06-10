const { passwordVerfication } = require('@/emailTemplate/emailVerfication');

const nodemailer = require('nodemailer');

const sendMail = async ({
  email,
  name,
  link,
  brickflow_app_email,
  subject = 'Verify your email | BrickFlow',
  type = 'emailVerfication',
  emailToken,
}) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"BrickFlow ERP" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html: passwordVerfication({ name, link }),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return null;
  }
};

module.exports = sendMail;
