const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP verify error code:', 
      error.code)
    console.error('SMTP verify error response:', 
      error.response)
    console.error('SMTP verify full error:', 
      JSON.stringify(error))
  } else {
    console.log('SMTP server is ready')
  }
})

module.exports = transporter;
