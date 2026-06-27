const Brevo = require('@getbrevo/brevo');

const apiInstance = new Brevo.TransactionalEmailsApi();

if (apiInstance.authentications['apiKey']) {
  apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
}
if (apiInstance.authentications['api-key']) {
  apiInstance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
}

const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  try {
    const sendSmtpEmail = {
      to: [{ 
        email: toEmail, 
        name: toName 
      }],
      sender: { 
        email: 'servicesedtech263@gmail.com',
        name: 'EdTech System' 
      },
      subject: subject,
      htmlContent: htmlContent
    };
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email sent to:', toEmail);
  } catch(err) {
    console.error('Brevo error:', err.message);
  }
};

module.exports = sendEmail;
