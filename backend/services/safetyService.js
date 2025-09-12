const SafetyProfile = require('../models/SafetyProfile');
const SafetyIncident = require('../models/SafetyIncident');
const CommunityThreat = require('../models/CommunityThreat');
const SafetyAuditLog = require('../models/SafetyAuditLog');
const User = require('../models/User');

class SafetyService {
  constructor() {
    this.riskFactors = {
      content_creator: 2,
      public_figure: 3,
      high_visibility_business: 2,
      young_entrepreneur: 1,
      solo_founder: 1,
      international_business: 1.5,
      tech_industry: 1.5,
      consulting: 1,
      education: 0.5,
      healthcare: 0.5,
      finance: 2,
      other: 1
    };
  }

  /**
   * Create or update safety profile for user
   */
  async createSafetyProfile(userId, profileData) {
    try {
      let profile = await SafetyProfile.findOne({ userId });
      
      if (profile) {
        // Update existing profile
        Object.assign(profile, profileData);
        profile.updatedAt = new Date();
      } else {
        // Create new profile
        profile = new SafetyProfile({
          userId,
          ...profileData
        });
      }

      // Calculate risk score and update protection level
      profile.calculateRiskScore();
      profile.updateProtectionLevel();
      
      await profile.save();
      
      // Log the action
      await this.logSafetyAction(userId, 'safety_assessment', {
        description: 'Safety profile created/updated',
        context: 'settings',
        platform: 'web',
        feature: 'ai_safety_mentor'
      }, true, false);

      return profile;
    } catch (error) {
      console.error('Error creating safety profile:', error);
      throw new Error('Failed to create safety profile');
    }
  }

  /**
   * Get safety profile for user
   */
  async getSafetyProfile(userId) {
    try {
      const profile = await SafetyProfile.findOne({ userId, isActive: true })
        .populate('userId', 'firstName lastName email');
      
      if (!profile) {
        // Create default profile if none exists
        return await this.createSafetyProfile(userId, {
          riskTolerance: 'moderate',
          vulnerabilityFactors: [],
          preferredProtections: ['content_analysis', 'privacy_controls'],
          culturalContext: 'kenyan',
          languagePreferences: ['en']
        });
      }

      return profile;
    } catch (error) {
      console.error('Error getting safety profile:', error);
      throw new Error('Failed to get safety profile');
    }
  }

  /**
   * Assess user's current risk level
   */
  async assessUserRisk(userId) {
    try {
      const profile = await this.getSafetyProfile(userId);
      const user = await User.findById(userId);
      
      if (!profile || !user) {
        throw new Error('User or safety profile not found');
      }

      // Get recent incidents
      const recentIncidents = await SafetyIncident.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        isActive: true
      });

      // Calculate risk factors
      const riskFactors = [];
      let totalRisk = 0;

      // Vulnerability factors
      profile.vulnerabilityFactors.forEach(factor => {
        const risk = this.riskFactors[factor] || 1;
        riskFactors.push({
          category: 'vulnerability',
          factor,
          score: risk,
          details: `Vulnerability factor: ${factor}`
        });
        totalRisk += risk;
      });

      // Recent incidents
      if (recentIncidents.length > 0) {
        const avgSeverity = recentIncidents.reduce((sum, incident) => sum + incident.severityLevel, 0) / recentIncidents.length;
        riskFactors.push({
          category: 'incidents',
          factor: 'recent_incidents',
          score: avgSeverity / 2, // Normalize to 0-5 scale
          details: `${recentIncidents.length} incidents in last 30 days`
        });
        totalRisk += avgSeverity / 2;
      }

      // Integration exposure
      const integrations = user.integrations || {};
      const connectedIntegrations = Object.keys(integrations).filter(key => 
        integrations[key] && integrations[key].connected
      );
      
      if (connectedIntegrations.length > 3) {
        riskFactors.push({
          category: 'technical',
          factor: 'integration_exposure',
          score: 1,
          details: `${connectedIntegrations.length} connected integrations`
        });
        totalRisk += 1;
      }

      // Update risk assessment
      profile.riskAssessment = {
        overallScore: Math.min(10, Math.max(0, totalRisk)),
        lastAssessed: new Date(),
        factors: riskFactors
      };

      profile.updateProtectionLevel();
      await profile.save();

      // Update user safety score
      user.safetySettings.safetyScore = profile.riskAssessment.overallScore;
      user.safetySettings.lastSafetyCheck = new Date();
      await user.save();

      return {
        profile,
        riskFactors,
        overallScore: profile.riskAssessment.overallScore,
        protectionLevel: profile.protectionLevel
      };
    } catch (error) {
      console.error('Error assessing user risk:', error);
      throw new Error('Failed to assess user risk');
    }
  }

  /**
   * Analyze content for safety risks
   */
  async analyzeContentSafety(userId, content, platform, context = {}) {
    try {
      const profile = await this.getSafetyProfile(userId);
      
      // Basic content analysis (in a real implementation, this would use AI/ML models)
      const risks = {
        harassment_likelihood: 0,
        privacy_exposure: 0,
        professional_risk: 0,
        timing_risk: 0,
        recommendations: []
      };

      // Check for potential harassment triggers
      const harassmentKeywords = ['stupid', 'ugly', 'worthless', 'failure', 'hate'];
      const contentLower = content.toLowerCase();
      
      harassmentKeywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
          risks.harassment_likelihood += 0.2;
        }
      });

      // Check for privacy exposure
      const privacyPatterns = [
        /\b\d{3}-\d{3}-\d{4}\b/, // Phone numbers
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
        /\b[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}\b/ // URLs
      ];

      privacyPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          risks.privacy_exposure += 0.3;
        }
      });

      // Check for professional risks
      const unprofessionalWords = ['damn', 'hell', 'crap', 'sucks'];
      unprofessionalWords.forEach(word => {
        if (contentLower.includes(word)) {
          risks.professional_risk += 0.1;
        }
      });

      // Generate recommendations
      if (risks.harassment_likelihood > 0.3) {
        risks.recommendations.push({
          type: 'warning',
          message: 'Content may trigger negative responses. Consider rephrasing.',
          severity: 'medium'
        });
      }

      if (risks.privacy_exposure > 0.2) {
        risks.recommendations.push({
          type: 'privacy',
          message: 'Content contains potentially sensitive information. Consider removing personal details.',
          severity: 'high'
        });
      }

      if (risks.professional_risk > 0.2) {
        risks.recommendations.push({
          type: 'professional',
          message: 'Content may not align with professional image. Consider using more formal language.',
          severity: 'low'
        });
      }

      // Log the analysis
      await this.logSafetyAction(userId, 'content_analysis', {
        description: `Content analyzed for ${platform}`,
        context: 'content_creation',
        platform: 'web',
        feature: 'content_analyzer'
      }, true, false, {
        contentLength: content.length,
        platform,
        riskLevel: Object.values(risks).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) > 0.5 ? 'medium' : 'low'
      });

      return risks;
    } catch (error) {
      console.error('Error analyzing content safety:', error);
      throw new Error('Failed to analyze content safety');
    }
  }

  /**
   * Report a safety incident
   */
  async reportIncident(userId, incidentData) {
    try {
      const incident = new SafetyIncident({
        userId,
        ...incidentData,
        status: 'reported'
      });

      await incident.save();

      // Update user's safety profile if needed
      const profile = await this.getSafetyProfile(userId);
      if (incident.severityLevel >= 7) {
        profile.protectionLevel = 'maximum';
        await profile.save();
      }

      // Log the incident report
      await this.logSafetyAction(userId, 'incident_report', {
        description: `Incident reported: ${incident.incidentType}`,
        context: 'emergency',
        platform: 'web',
        feature: 'incident_reporter'
      }, true, false, {
        incidentType: incident.incidentType,
        severityLevel: incident.severityLevel
      });

      // If high severity, trigger emergency protocols
      if (incident.severityLevel >= 8) {
        await this.triggerEmergencyProtocol(userId, incident);
      }

      return incident;
    } catch (error) {
      console.error('Error reporting incident:', error);
      throw new Error('Failed to report incident');
    }
  }

  /**
   * Get community threats relevant to user
   */
  async getRelevantThreats(userId, limit = 10) {
    try {
      const profile = await this.getSafetyProfile(userId);
      const user = await User.findById(userId);
      
      if (!profile || !user) {
        throw new Error('User or safety profile not found');
      }

      // Determine user context
      const region = profile.culturalContext === 'kenyan' ? 'kenya' : 'international';
      const sector = this.determineIndustrySector(user);
      const demographic = this.determineDemographic(profile);

      const threats = await CommunityThreat.findByContext(region, sector, demographic);
      
      return threats.slice(0, limit);
    } catch (error) {
      console.error('Error getting relevant threats:', error);
      throw new Error('Failed to get relevant threats');
    }
  }

  /**
   * Log safety-related actions for audit trail
   */
  async logSafetyAction(userId, actionType, actionDetails, systemDecision, userOverride, metadata = {}) {
    try {
      const log = new SafetyAuditLog({
        userId,
        actionType,
        actionDetails,
        systemDecision,
        userOverride,
        metadata: {
          ...metadata,
          timestamp: new Date()
        }
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging safety action:', error);
      // Don't throw error for logging failures to avoid breaking main functionality
    }
  }

  /**
   * Trigger emergency protocols
   */
  async triggerEmergencyProtocol(userId, incident) {
    try {
      const profile = await this.getSafetyProfile(userId);
      
      // Notify emergency contacts
      if (profile.emergencyContacts && profile.emergencyContacts.length > 0) {
        // In a real implementation, this would send actual notifications
        console.log(`Emergency protocol triggered for user ${userId}`);
        console.log('Emergency contacts:', profile.emergencyContacts);
      }

      // Log emergency activation
      await this.logSafetyAction(userId, 'emergency_activation', {
        description: 'Emergency protocol activated',
        context: 'emergency',
        platform: 'system',
        feature: 'emergency_response'
      }, true, false, {
        incidentId: incident._id,
        severityLevel: incident.severityLevel
      });

      return true;
    } catch (error) {
      console.error('Error triggering emergency protocol:', error);
      throw new Error('Failed to trigger emergency protocol');
    }
  }

  /**
   * Helper method to determine industry sector
   */
  determineIndustrySector(user) {
    // This would be more sophisticated in a real implementation
    // Could analyze user's LinkedIn profile, business description, etc.
    return 'technology'; // Default
  }

  /**
   * Helper method to determine demographic
   */
  determineDemographic(profile) {
    if (profile.vulnerabilityFactors.includes('content_creator')) {
      return 'content_creators';
    } else if (profile.vulnerabilityFactors.includes('young_entrepreneur')) {
      return 'young_professionals';
    } else if (profile.vulnerabilityFactors.includes('solo_founder')) {
      return 'women_entrepreneurs';
    }
    return 'all';
  }

  /**
   * Get safety statistics for user
   */
  async getSafetyStats(userId, timeRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      const [incidentStats, auditStats] = await Promise.all([
        SafetyIncident.getIncidentStats(userId, timeRange),
        SafetyAuditLog.getAuditStats(userId, timeRange)
      ]);

      const profile = await this.getSafetyProfile(userId);

      return {
        profile: {
          riskTolerance: profile.riskTolerance,
          protectionLevel: profile.protectionLevel,
          safetyScore: profile.riskAssessment.overallScore,
          lastAssessed: profile.riskAssessment.lastAssessed
        },
        incidents: incidentStats,
        auditTrail: auditStats,
        timeRange
      };
    } catch (error) {
      console.error('Error getting safety stats:', error);
      throw new Error('Failed to get safety statistics');
    }
  }
}

module.exports = new SafetyService();
