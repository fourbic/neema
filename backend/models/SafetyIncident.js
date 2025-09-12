const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SafetyIncidentSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  incidentType: {
    type: String,
    enum: [
      'harassment',
      'cyberbullying',
      'doxxing',
      'financial_fraud',
      'impersonation',
      'privacy_violation',
      'professional_sabotage',
      'threat',
      'stalking',
      'hate_speech',
      'discrimination',
      'other'
    ],
    required: true
  },
  severityLevel: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  status: {
    type: String,
    enum: ['reported', 'investigating', 'resolved', 'escalated', 'dismissed'],
    default: 'reported'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  encryptedDetails: {
    type: String,
    select: false // Hide by default for privacy
  },
  platform: {
    type: String,
    enum: ['linkedin', 'email', 'social_media', 'phone', 'in_person', 'other'],
    required: true
  },
  perpetratorInfo: {
    isKnown: { type: Boolean, default: false },
    relationship: {
      type: String,
      enum: ['stranger', 'acquaintance', 'colleague', 'client', 'competitor', 'former_partner', 'other']
    },
    contactInfo: { type: String, select: false },
    socialProfiles: [String]
  },
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'email', 'message', 'audio', 'video', 'document', 'other']
    },
    url: String,
    description: String,
    timestamp: Date
  }],
  actionsTaken: [{
    action: {
      type: String,
      enum: [
        'blocked_user',
        'reported_platform',
        'contacted_support',
        'documented_evidence',
        'changed_privacy_settings',
        'contacted_authorities',
        'sought_legal_advice',
        'informed_emergency_contacts',
        'other'
      ]
    },
    timestamp: { type: Date, default: Date.now },
    details: String,
    outcome: String
  }],
  supportOrganizations: [{
    name: String,
    contactInfo: String,
    contacted: { type: Boolean, default: false },
    contactedAt: Date,
    response: String
  }],
  resolution: {
    resolvedAt: Date,
    resolutionType: {
      type: String,
      enum: ['platform_action', 'legal_action', 'self_resolved', 'ongoing', 'other']
    },
    resolutionDetails: String,
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date
  },
  impactAssessment: {
    emotionalImpact: {
      type: Number,
      min: 1,
      max: 10
    },
    businessImpact: {
      type: Number,
      min: 1,
      max: 10
    },
    financialImpact: {
      type: Number,
      min: 1,
      max: 10
    },
    professionalImpact: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  communityContribution: {
    anonymized: { type: Boolean, default: true },
    threatPattern: String,
    contributedAt: Date,
    patternId: String // Reference to community threat pattern
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
SafetyIncidentSchema.index({ userId: 1, createdAt: -1 });
SafetyIncidentSchema.index({ incidentType: 1 });
SafetyIncidentSchema.index({ severityLevel: 1 });
SafetyIncidentSchema.index({ status: 1 });
SafetyIncidentSchema.index({ platform: 1 });
SafetyIncidentSchema.index({ 'communityContribution.patternId': 1 });

// Virtual for total impact score
SafetyIncidentSchema.virtual('totalImpactScore').get(function() {
  if (!this.impactAssessment) return 0;
  
  const { emotionalImpact, businessImpact, financialImpact, professionalImpact } = this.impactAssessment;
  return (emotionalImpact + businessImpact + financialImpact + professionalImpact) / 4;
});

// Method to anonymize incident for community sharing
SafetyIncidentSchema.methods.anonymizeForCommunity = function() {
  return {
    incidentType: this.incidentType,
    severityLevel: this.severityLevel,
    platform: this.platform,
    perpetratorInfo: {
      isKnown: this.perpetratorInfo.isKnown,
      relationship: this.perpetratorInfo.relationship
    },
    actionsTaken: this.actionsTaken.map(action => ({
      action: action.action,
      timestamp: action.timestamp,
      outcome: action.outcome
    })),
    impactAssessment: this.impactAssessment,
    createdAt: this.createdAt,
    // Remove all personally identifiable information
    userId: undefined,
    description: undefined,
    encryptedDetails: undefined,
    perpetratorInfo: {
      ...this.perpetratorInfo,
      contactInfo: undefined,
      socialProfiles: undefined
    },
    evidence: undefined,
    supportOrganizations: undefined,
    resolution: undefined
  };
};

// Static method to find incidents by severity
SafetyIncidentSchema.statics.findBySeverity = function(minSeverity = 1, maxSeverity = 10) {
  return this.find({
    severityLevel: { $gte: minSeverity, $lte: maxSeverity },
    isActive: true
  });
};

// Static method to find unresolved incidents
SafetyIncidentSchema.statics.findUnresolved = function() {
  return this.find({
    status: { $in: ['reported', 'investigating', 'escalated'] },
    isActive: true
  });
};

// Static method to get incident statistics
SafetyIncidentSchema.statics.getIncidentStats = function(userId, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$incidentType',
        count: { $sum: 1 },
        avgSeverity: { $avg: '$severityLevel' },
        avgImpact: { $avg: '$totalImpactScore' }
      }
    }
  ]);
};

module.exports = mongoose.model('SafetyIncident', SafetyIncidentSchema);
