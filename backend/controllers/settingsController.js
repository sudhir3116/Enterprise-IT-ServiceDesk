const Settings = require('../models/Settings');
const { logAudit } = require('../utils/auditLogger');

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching settings', error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { sessionTimeoutMinutes } = req.body;

    // Validate timeout range if provided
    if (sessionTimeoutMinutes !== undefined) {
      if (sessionTimeoutMinutes < 1 || sessionTimeoutMinutes > 1440) {
        return res.status(400).json({ 
          message: 'Session timeout must be between 1 and 1440 minutes.' 
        });
      }
    }

    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings(req.body);
      await settings.save();
      return res.json(settings);
    }
    
    const oldTimeout = settings.sessionTimeoutMinutes;
    
    Object.assign(settings, req.body);
    await settings.save();

    // Audit log if timeout changed
    if (sessionTimeoutMinutes !== undefined && sessionTimeoutMinutes !== oldTimeout) {
      await logAudit({
        entity: "Settings",
        entityId: settings._id,
        action: "Updated Session Timeout",
        performedBy: req.user._id, // Assumes req.user is set by authMiddleware
        ipAddress: req.ip || req.connection?.remoteAddress,
        before: { sessionTimeoutMinutes: oldTimeout },
        after: { sessionTimeoutMinutes }
      });
    }

    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: 'Error updating settings', error: err.message });
  }
};
