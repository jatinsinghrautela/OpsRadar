const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: false, // STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
});

const sendOTPEmail = async (to, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are missing');
  }

  const mailOptions = {
    from: 'no-reply-opsradar@demomailtrap.co',
    to,
    subject: 'Password Reset OTP - OpsRadar',
    text: `Your OTP for password reset is: ${otp}. It is valid for 10 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
};

module.exports = { sendOTPEmail };