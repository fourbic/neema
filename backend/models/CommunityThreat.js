const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommunityThreatSchema = new Schema({
  threatPatternHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  threatCategory: {
    type: String,
    enum: [
      'harassment',
      'cyberbullying',
      'financial_fraud',
      'privacy_violation',
      'impersonation',
      'professional_sabotage',
      'doxxing',
      'stalking',
      'hate_speech',
      'discrimination',
      'scam',
      'phishing',
      'other'
    ],
    required: true
  },
  threatSubcategory: {
    type: String,
    trim: true
  },
  geographicRegion: {
    type: String,
    enum: ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'kenya', 'east_africa', 'international'],
    default: 'kenya'
  },
  industrySector: {
    type: String,
    enum: [
      'technology',
      'consulting',
      'education',
      'healthcare',
      'finance',
      'retail',
      'manufacturing',
      'agriculture',
      'tourism',
      'media',
      'non_profit',
      'government',
      'other'
    ]
  },
  targetDemographic: {
    type: String,
    enum: [
      'women_entrepreneurs',
      'content_creators',
      'young_professionals',
      'established_business_owners',
      'tech_workers',
      'consultants',
      'freelancers',
      'all'
    ],
    default: 'all'
  },
  severityScore: {
    type: Number,
    min: 1,
    max: 10,
    required: true
  },
  threatDescription: {
    type: String,
    required: true,
    trim: true
  },
  commonIndicators: [{
    type: String,
    trim: true
  }],
  mitigationStrategies: [{
    strategy: {
      type: String,
      required: true
    },
    effectiveness: {
      type: Number,
      min: 1,
      max: 10
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    resources: [String]
  }],
  preventionTips: [{
    tip: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['proactive', 'reactive', 'educational', 'technical']
    }
  }],
  reportedCount: {
    type: Number,
    default: 1
  },
  lastReported: {
    type: Date,
    default: Date.now
  },
  firstReported: {
    type: Date,
    default: Date.now
  },
  trend: {
    type: String,
    enum: ['increasing', 'stable', 'decreasing', 'new'],
    default: 'new'
  },
  relatedThreats: [{
    type: Schema.Types.ObjectId,
    ref: 'CommunityThreat'
  }],
  supportResources: [{
    organization: {
      type: String,
      required: true
    },
    contactInfo: String,
    services: [String],
    availability: {
      type: String,
      enum: ['24_7', 'business_hours', 'appointment_only', 'emergency_only']
    },
    cost: {
      type: String,
      enum: ['free', 'low_cost', 'moderate', 'high', 'varies']
    }
  }],
  legalFramework: {
    applicableLaws: [String],
    reportingRequirements: [String],
    evidenceCollection: [String],
    legalRecourse: [String]
  },
  aiDetectionPatterns: {
    keywords: [String],
    behavioralPatterns: [String],
    communicationStyles: [String],
    technicalIndicators: [String]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationSource: {
    type: String,
    enum: ['user_reports', 'ai_analysis', 'expert_review', 'official_source']
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
CommunityThreatSchema.index({ threatCategory: 1, severityScore: -1 });
CommunityThreatSchema.index({ geographicRegion: 1, industrySector: 1 });
CommunityThreatSchema.index({ targetDemographic: 1 });
CommunityThreatSchema.index({ trend: 1, lastReported: -1 });
CommunityThreatSchema.index({ isActive: 1, isVerified: 1 });

// Virtual for threat urgency
CommunityThreatSchema.virtual('urgencyLevel').get(function() {
  const daysSinceLastReport = (new Date() - this.lastReported) / (1000 * 60 * 60 * 24);
  
  if (this.severityScore >= 8 && daysSinceLastReport <= 7) {
    return 'critical';
  } else if (this.severityScore >= 6 && daysSinceLastReport <= 14) {
    return 'high';
  } else if (this.severityScore >= 4 && daysSinceLastReport <= 30) {
    return 'medium';
  } else {
    return 'low';
  }
});

// Method to update trend based on recent reports
CommunityThreatSchema.methods.updateTrend = function() {
  const daysSinceFirst = (new Date() - this.firstReported) / (1000 * 60 * 60 * 24);
  const daysSinceLast = (new Date() - this.lastReported) / (1000 * 60 * 60 * 24);
  
  if (daysSinceFirst <= 7) {
    this.trend = 'new';
  } else if (daysSinceLast <= 3) {
    this.trend = 'increasing';
  } else if (daysSinceLast <= 14) {
    this.trend = 'stable';
  } else {
    this.trend = 'decreasing';
  }
  
  return this.trend;
};

// Method to get relevant mitigation strategies for user context
CommunityThreatSchema.methods.getRelevantMitigations = function(userContext) {
  return this.mitigationStrategies.filter(strategy => {
    // Filter based on user's risk tolerance, available resources, etc.
    if (userContext.riskTolerance === 'conservative' && strategy.difficulty === 'hard') {
      return false;
    }
    return true;
  }).sort((a, b) => b.effectiveness - a.effectiveness);
};

// Static method to find threats by region and sector
CommunityThreatSchema.statics.findByContext = function(region, sector, demographic) {
  const query = {
    isActive: true,
    isVerified: true,
    $or: [
      { geographicRegion: region },
      { geographicRegion: 'kenya' },
      { geographicRegion: 'international' }
    ]
  };
  
  if (sector) {
    query.$or.push({ industrySector: sector });
  }
  
  if (demographic) {
    query.$or.push({ targetDemographic: demographic });
    query.$or.push({ targetDemographic: 'all' });
  }
  
  return this.find(query).sort({ severityScore: -1, lastReported: -1 });
};

// Static method to find trending threats
CommunityThreatSchema.statics.findTrending = function(limit = 10) {
  return this.find({
    isActive: true,
    isVerified: true,
    trend: { $in: ['increasing', 'new'] }
  })
  .sort({ severityScore: -1, lastReported: -1 })
  .limit(limit);
};

// Static method to get threat statistics
CommunityThreatSchema.statics.getThreatStats = function(region, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  return this.aggregate([
    {
      $match: {
        isActive: true,
        isVerified: true,
        lastReported: { $gte: startDate },
        ...(region && { geographicRegion: region })
      }
    },
    {
      $group: {
        _id: '$threatCategory',
        count: { $sum: 1 },
        avgSeverity: { $avg: '$severityScore' },
        maxSeverity: { $max: '$severityScore' },
        trends: { $addToSet: '$trend' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('CommunityThreat', CommunityThreatSchema);
