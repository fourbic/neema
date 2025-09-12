const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SafetyAuditLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actionType: {
    type: String,
    enum: [
      'safety_assessment',
      'content_analysis',
      'threat_detection',
      'contact_verification',
      'privacy_setting_change',
      'incident_report',
      'emergency_activation',
      'support_contact',
      'ai_recommendation',
      'user_override',
      'system_alert',
      'data_access',
      'data_export',
      'data_deletion',
      'consent_given',
      'consent_withdrawn',
      'integration_connected',
      'integration_disconnected',
      'profile_update',
      'risk_reassessment',
      'other'
    ],
    required: true
  },
  actionDetails: {
    description: {
      type: String,
      required: true
    },
    context: {
      type: String,
      enum: ['dashboard', 'content_creation', 'networking', 'communication', 'settings', 'emergency', 'system', 'other']
    },
    platform: {
      type: String,
      enum: ['web', 'mobile', 'api', 'system', 'integration']
    },
    feature: {
      type: String,
      enum: [
        'ai_safety_mentor',
        'content_analyzer',
        'threat_detector',
        'contact_verifier',
        'privacy_controls',
        'incident_reporter',
        'emergency_response',
        'community_intelligence',
        'safe_networking',
        'encrypted_notes',
        'other'
      ]
    }
  },
  systemDecision: {
    type: Boolean,
    required: true
  },
  userOverride: {
    type: Boolean,
    default: false
  },
  overrideReason: {
    type: String,
    trim: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  outcome: {
    type: String,
    enum: ['success', 'warning', 'blocked', 'escalated', 'ignored', 'pending'],
    default: 'success'
  },
  metadata: {
    ipAddress: { type: String, select: false },
    userAgent: { type: String, select: false },
    sessionId: { type: String, select: false },
    deviceInfo: {
      type: { type: String },
      os: String,
      browser: String
    },
    location: {
      country: String,
      region: String,
      city: String
    }
  },
  relatedEntities: {
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'SafetyIncident'
    },
    threatId: {
      type: Schema.Types.ObjectId,
      ref: 'CommunityThreat'
    },
    contactId: String,
    contentId: String,
    integrationId: String
  },
  performanceMetrics: {
    responseTime: Number, // milliseconds
    processingTime: Number, // milliseconds
    accuracy: Number, // 0-1
    confidence: Number // 0-1
  },
  complianceFlags: {
    gdprRelevant: { type: Boolean, default: false },
    dataProtectionAct: { type: Boolean, default: false },
    consentRequired: { type: Boolean, default: false },
    auditRequired: { type: Boolean, default: false }
  },
  isSensitive: {
    type: Boolean,
    default: false
  },
  retentionPeriod: {
    type: Number, // days
    default: 2555 // 7 years default
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // We only want createdAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries and compliance
SafetyAuditLogSchema.index({ userId: 1, createdAt: -1 });
SafetyAuditLogSchema.index({ actionType: 1, createdAt: -1 });
SafetyAuditLogSchema.index({ 'actionDetails.context': 1 });
SafetyAuditLogSchema.index({ 'actionDetails.feature': 1 });
SafetyAuditLogSchema.index({ riskLevel: 1 });
SafetyAuditLogSchema.index({ outcome: 1 });
SafetyAuditLogSchema.index({ 'complianceFlags.auditRequired': 1 });
SafetyAuditLogSchema.index({ createdAt: -1 }); // For retention policies

// TTL index for automatic deletion based on retention period
SafetyAuditLogSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 0, // We'll handle expiration manually based on retentionPeriod
    partialFilterExpression: { retentionPeriod: { $exists: true } }
  }
);

// Virtual for audit trail completeness
SafetyAuditLogSchema.virtual('auditCompleteness').get(function() {
  let score = 0;
  if (this.actionDetails.description) score += 25;
  if (this.actionDetails.context) score += 25;
  if (this.metadata.ipAddress) score += 25;
  if (this.relatedEntities) score += 25;
  return score;
});

// Method to check if log entry meets compliance requirements
SafetyAuditLogSchema.methods.isCompliant = function() {
  const required = [
    this.userId,
    this.actionType,
    this.actionDetails.description,
    this.systemDecision,
    this.createdAt
  ];
  
  return required.every(field => field !== null && field !== undefined);
};

// Method to anonymize for analytics (remove PII)
SafetyAuditLogSchema.methods.anonymizeForAnalytics = function() {
  return {
    actionType: this.actionType,
    actionDetails: {
      context: this.actionDetails.context,
      platform: this.actionDetails.platform,
      feature: this.actionDetails.feature
    },
    systemDecision: this.systemDecision,
    userOverride: this.userOverride,
    riskLevel: this.riskLevel,
    outcome: this.outcome,
    metadata: {
      deviceInfo: this.metadata.deviceInfo,
      location: {
        country: this.metadata.location?.country,
        region: this.metadata.location?.region
        // Remove city for privacy
      }
    },
    performanceMetrics: this.performanceMetrics,
    complianceFlags: this.complianceFlags,
    createdAt: this.createdAt
    // Remove userId, IP address, session ID, and other PII
  };
};

// Static method to find logs by user and time range
SafetyAuditLogSchema.statics.findByUserAndTimeRange = function(userId, startDate, endDate) {
  return this.find({
    userId: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  }).sort({ createdAt: -1 });
};

// Static method to find high-risk actions
SafetyAuditLogSchema.statics.findHighRiskActions = function(timeRange = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.find({
    riskLevel: { $in: ['high', 'critical'] },
    createdAt: { $gte: startDate }
  }).sort({ createdAt: -1 });
};

// Static method to get audit statistics
SafetyAuditLogSchema.statics.getAuditStats = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$actionType',
        count: { $sum: 1 },
        avgRiskLevel: { $avg: { $cond: [
          { $eq: ['$riskLevel', 'low'] }, 1,
          { $cond: [
            { $eq: ['$riskLevel', 'medium'] }, 2,
            { $cond: [
              { $eq: ['$riskLevel', 'high'] }, 3,
              { $cond: [
                { $eq: ['$riskLevel', 'critical'] }, 4, 0
              ]}
            ]}
          ]}
        ]}},
        userOverrides: { $sum: { $cond: ['$userOverride', 1, 0] } },
        systemDecisions: { $sum: { $cond: ['$systemDecision', 1, 0] } }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Static method to find compliance issues
SafetyAuditLogSchema.statics.findComplianceIssues = function() {
  return this.find({
    $or: [
      { 'complianceFlags.auditRequired': true },
      { isSensitive: true },
      { 'complianceFlags.gdprRelevant': true },
      { 'complianceFlags.dataProtectionAct': true }
    ]
  }).sort({ createdAt: -1 });
};

// Pre-save middleware to set retention period based on sensitivity
SafetyAuditLogSchema.pre('save', function(next) {
  if (this.isSensitive || this.complianceFlags.auditRequired) {
    this.retentionPeriod = 2555; // 7 years for sensitive data
  } else if (this.riskLevel === 'high' || this.riskLevel === 'critical') {
    this.retentionPeriod = 1095; // 3 years for high-risk actions
  } else {
    this.retentionPeriod = 365; // 1 year for normal actions
  }
  next();
});

module.exports = mongoose.model('SafetyAuditLog', SafetyAuditLogSchema);
