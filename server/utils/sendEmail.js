const transporter = require('../config/emailConfig');

const sendResetEmail = async (toEmail, userName, resetLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'EdTech - Password Reset Request',
      html: `
        <h2>Hello ${userName},</h2>
        <p>You requested a password reset.</p>
        <p>Click button below to reset:</p>
        <a href="${resetLink}" 
           style="background:#6B21A8;
           color:white;padding:12px 24px;
           border-radius:8px;
           text-decoration:none;
           display:inline-block;">
           Reset Password
        </a>
        <p>Link expires in 15 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Reset email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`SMTP Failed to send reset email to ${toEmail}. Fallback log:`);
    console.log('--- RESET EMAIL ---');
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Link: ${resetLink}`);
    console.log('--------------------');
    return false;
  }
};

const sendLockoutEmail = async (toEmail, userName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'EdTech - Account Locked Notification',
      html: `
        <h2>Hello ${userName},</h2>
        <p>Your account has been locked due to 5 consecutive failed login attempts.</p>
        <p>Your account will remain locked for 30 minutes.</p>
        <p>If you did not perform these attempts, please contact the administrator immediately.</p>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Lockout email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`SMTP Failed to send lockout email to ${toEmail}. Fallback log:`);
    console.log('--- LOCKOUT EMAIL ---');
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Status: Locked for 30 minutes`);
    console.log('----------------------');
    return false;
  }
};

const sendPasswordChangedEmail = async (toEmail, userName) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'EdTech - Password Changed Confirmation',
      html: `
        <h2>Hello ${userName},</h2>
        <p>This is confirmation that the password for your account was successfully changed.</p>
        <p>If you did this, you can ignore this confirmation email.</p>
        <p style="color:red; font-weight:bold;">If you did NOT change your password, please contact the administrator immediately.</p>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Password change confirmation email sent to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`SMTP Failed to send password changed email to ${toEmail}. Fallback log:`);
    console.log('--- PASSWORD CHANGED EMAIL ---');
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Status: Password changed successfully`);
    console.log('------------------------------');
    return false;
  }
};

const sendWelcomeEmail = async (toEmail, userName, tempPassword, role) => {
  try {
    const clientUrl = process.env.CLIENT_URL || 'https://edtech-college-website.vercel.app';
    const loginLink = `${clientUrl}/login`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Welcome to EdTech - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Welcome to EdTech!</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
          <p>Here are your account login details:</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8e5; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Login Page:</strong> <a href="${loginLink}" style="color: #4f46e5; font-weight: bold;">${loginLink}</a></p>
            <p style="margin: 0 0 8px 0;"><strong>Username / Email:</strong> ${toEmail}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${tempPassword}</code></p>
          </div>
          <p style="color: #ea580c; font-weight: bold;">Please change your password on first login to secure your account.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #64748b; text-align: center;">EdTech Inc. · 123 Education Way</p>
        </div>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    const clientUrl = process.env.CLIENT_URL || 'https://edtech-college-website.vercel.app';
    const loginLink = `${clientUrl}/login`;
    console.error(`SMTP Failed to send welcome email to ${toEmail}. Fallback log:`);
    console.log('--- WELCOME EMAIL ---');
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Role: ${role}`);
    console.log(`Login Link: ${loginLink}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log(`Status: Please change password on first login`);
    console.log('----------------------');
    return false;
  }
};

module.exports = {
  sendResetEmail,
  sendLockoutEmail,
  sendPasswordChangedEmail,
  sendWelcomeEmail
};
