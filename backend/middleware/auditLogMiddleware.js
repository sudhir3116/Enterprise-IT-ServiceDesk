const AuditLog = require('../models/AuditLog');

const auditLogMiddleware = (actionName) => {
  return async (req, res, next) => {
    // We want to capture the response, so we hook into res.send / res.json
    // Or we can just log the attempt. Let's log it after it finishes.
    const originalSend = res.send;
    
    res.send = function (body) {
      res.send = originalSend;
      const result = res.send(body);

      // Only log on successful creation/update/delete (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          // Parse body if it's JSON string
          let parsedBody = {};
          if (typeof body === 'string') {
            try { parsedBody = JSON.parse(body); } catch (e) {}
          } else if (typeof body === 'object') {
            parsedBody = body;
          }

          const entityId = parsedBody._id || req.params.id || null;
          
          if (entityId && req.user) {
             const log = new AuditLog({
               entity: 'SystemConfig',
               entityId: entityId,
               action: actionName,
               performedBy: req.user._id,
               details: `${actionName} performed by ${req.user.name}`,
               ipAddress: req.ip || req.connection.remoteAddress
             });
             log.save().catch(err => console.error("Audit Log Save Error:", err));
          }
        } catch (error) {
          console.error("Error in audit log middleware:", error);
        }
      }
      return result;
    };
    
    next();
  };
};

module.exports = auditLogMiddleware;
