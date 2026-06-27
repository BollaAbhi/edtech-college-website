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
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'EdTech - Welcome to EdTech!',
      html: `
        <h2>Welcome to EdTech, ${userName}!</h2>
        <p>Your account has been successfully created as a <strong>${role}</strong>.</p>
        <p>Here are your temporary login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${toEmail}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>
        <p>For security, please log in and change your password as soon as possible.</p>
      `
    };
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`SMTP Failed to send welcome email to ${toEmail}. Fallback log:`);
    console.log('--- WELCOME EMAIL ---');
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Role: ${role}`);
    console.log(`Temporary Password: ${tempPassword}`);
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
