const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SafetyProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  riskTolerance: {
    type: String,
    enum: ['conservative', 'moderate', 'open'],
    default: 'moderate'
  },
  vulnerabilityFactors: [{
    type: String,
    enum: [
      'content_creator',
      'public_figure',
      'high_visibility_business',
      'young_entrepreneur',
      'solo_founder',
      'international_business',
      'tech_industry',
      'consulting',
      'education',
      'healthcare',
      'finance',
      'other'
    ]
  }],
  preferredProtections: [{
    type: String,
    enum: [
      'content_analysis',
      'contact_verification',
      'privacy_controls',
      'threat_detection',
      'emergency_response',
      'community_support',
      'encrypted_communication',
      'safe_networking',
      'brand_monitoring',
      'incident_reporting'
    ]
  }],
  emergencyContacts: [{
    name: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      enum: ['family', 'friend', 'colleague', 'legal', 'support_organization', 'other']
    },
    contactMethod: {
      type: String,
      enum: ['phone', 'email', 'whatsapp', 'telegram', 'other']
    },
    contactInfo: {
      type: String,
      required: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  culturalContext: {
    type: String,
    enum: ['kenyan', 'east_african', 'international'],
    default: 'kenyan'
  },
  languagePreferences: [{
    type: String,
    enum: ['en', 'sw', 'fr', 'ar', 'other']
  }],
  safetySettings: {
    contentAnalysis: {
      enabled: { type: Boolean, default: true },
      sensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
      platforms: [String] // ['linkedin', 'email', 'notes', 'social_media']
    },
    privacyControls: {
      dataSharing: {
        platforms: { type: Map, of: Boolean },
        dataTypes: { type: Map, of: Boolean },
        timeLimits: { type: Map, of: Number }
      },
      visibility: {
        profile: { type: String, enum: ['public', 'connections', 'private'], default: 'connections' },
        business: { type: String, enum: ['public', 'verified', 'private'], default: 'verified' },
        personal: { type: String, enum: ['private', 'emergency_contacts'], default: 'private' }
      }
    },
    notifications: {
      safetyAlerts: { type: Boolean, default: true },
      threatWarnings: { type: Boolean, default: true },
      communityUpdates: { type: Boolean, default: true },
      emergencyAlerts: { type: Boolean, default: true }
    }
  },
  riskAssessment: {
    overallScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 5
    },
    lastAssessed: {
      type: Date,
      default: Date.now
    },
    factors: [{
      category: {
        type: String,
        enum: ['harassment', 'privacy', 'financial', 'professional', 'technical']
      },
      score: {
        type: Number,
        min: 0,
        max: 10
      },
      details: String
    }]
  },
  protectionLevel: {
    type: String,
    enum: ['standard', 'elevated', 'maximum'],
    default: 'standard'
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

// Index for faster queries
SafetyProfileSchema.index({ userId: 1 });
SafetyProfileSchema.index({ protectionLevel: 1 });
SafetyProfileSchema.index({ riskTolerance: 1 });

// Method to calculate overall risk score
SafetyProfileSchema.methods.calculateRiskScore = function() {
  if (!this.riskAssessment.factors || this.riskAssessment.factors.length === 0) {
    return 5; // Default moderate risk
  }
  
  const totalScore = this.riskAssessment.factors.reduce((sum, factor) => sum + factor.score, 0);
  const averageScore = totalScore / this.riskAssessment.factors.length;
  
  // Adjust based on vulnerability factors
  let adjustment = 0;
  if (this.vulnerabilityFactors.includes('content_creator')) adjustment += 1;
  if (this.vulnerabilityFactors.includes('public_figure')) adjustment += 2;
  if (this.vulnerabilityFactors.includes('high_visibility_business')) adjustment += 1;
  if (this.vulnerabilityFactors.includes('young_entrepreneur')) adjustment += 0.5;
  
  const finalScore = Math.min(10, Math.max(0, averageScore + adjustment));
  this.riskAssessment.overallScore = finalScore;
  this.riskAssessment.lastAssessed = new Date();
  
  return finalScore;
};

// Method to determine protection level based on risk score
SafetyProfileSchema.methods.updateProtectionLevel = function() {
  const riskScore = this.riskAssessment.overallScore;
  
  if (riskScore >= 8) {
    this.protectionLevel = 'maximum';
  } else if (riskScore >= 5) {
    this.protectionLevel = 'elevated';
  } else {
    this.protectionLevel = 'standard';
  }
  
  return this.protectionLevel;
};

// Static method to find profiles by risk level
SafetyProfileSchema.statics.findByRiskLevel = function(level) {
  return this.find({ protectionLevel: level, isActive: true });
};

// Static method to find profiles needing assessment
SafetyProfileSchema.statics.findNeedingAssessment = function(daysOld = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.find({
    $or: [
      { 'riskAssessment.lastAssessed': { $lt: cutoffDate } },
      { 'riskAssessment.lastAssessed': { $exists: false } }
    ],
    isActive: true
  });
};

module.exports = mongoose.model('SafetyProfile', SafetyProfileSchema);
