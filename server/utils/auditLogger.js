const AuditLog = require('../models/AuditLog');

const logEvent = async ({ userId, userEmail, userRole, action, ipAddress, success, details }) => {
  try {
    await AuditLog.create({
      userId,
      userEmail: userEmail || 'unknown@system.com',
      userRole: userRole || '',
      action,
      ipAddress: ipAddress || '',
      success: success !== undefined ? success : true,
      details: details || '',
    });
  } catch (err) {
    console.error('Audit Log failed to write:', err);
  }
};

module.exports = logEvent;
