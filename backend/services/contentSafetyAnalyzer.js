const SafetyProfile = require('../models/SafetyProfile');
const SafetyAuditLog = require('../models/SafetyAuditLog');

class ContentSafetyAnalyzer {
  constructor() {
    // Harassment detection patterns (in a real implementation, these would be ML models)
    this.harassmentPatterns = {
      direct: [
        'stupid', 'ugly', 'worthless', 'failure', 'hate', 'disgusting',
        'pathetic', 'loser', 'idiot', 'moron', 'dumb', 'retard'
      ],
      indirect: [
        'you should', 'you need to', 'you must', 'you have to',
        'everyone knows', 'obviously', 'clearly', 'it\'s obvious'
      ],
      threatening: [
        'kill', 'hurt', 'destroy', 'ruin', 'end', 'finish',
        'you\'ll pay', 'you\'ll regret', 'watch out', 'be careful'
      ]
    };

    // Privacy exposure patterns
    this.privacyPatterns = {
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      url: /\bhttps?:\/\/[^\s]+/g,
      address: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
    };

    // Professional risk indicators
    this.professionalRisks = {
      unprofessional: [
        'damn', 'hell', 'crap', 'sucks', 'bullshit', 'fuck', 'shit',
        'bitch', 'asshole', 'dick', 'piss', 'pissed'
      ],
      controversial: [
        'politics', 'religion', 'abortion', 'gun control', 'immigration',
        'climate change', 'vaccines', 'conspiracy', 'fake news'
      ],
      personal: [
        'my ex', 'my husband', 'my wife', 'my boyfriend', 'my girlfriend',
        'my family', 'my kids', 'my children', 'my parents'
      ]
    };

    // Timing risk factors
    this.timingRisks = {
      lateNight: { start: 22, end: 6, risk: 0.3 },
      earlyMorning: { start: 5, end: 8, risk: 0.2 },
      weekend: { risk: 0.1 },
      holiday: { risk: 0.2 }
    };
  }

  /**
   * Analyze content for safety risks
   */
  async analyzeContent(userId, content, platform, context = {}) {
    try {
      const profile = await this.getUserSafetyProfile(userId);
      const analysis = {
        contentId: context.contentId || null,
        platform,
        timestamp: new Date(),
        risks: {
          harassment: await this.analyzeHarassmentRisk(content, profile),
          privacy: await this.analyzePrivacyRisk(content, profile),
          professional: await this.analyzeProfessionalRisk(content, profile),
          timing: await this.analyzeTimingRisk(context, profile)
        },
        recommendations: [],
        alternatives: [],
        confidence: 0.8
      };

      // Generate overall risk score
      analysis.overallRisk = this.calculateOverallRisk(analysis.risks);
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis.risks, profile);
      
      // Generate alternative content suggestions
      analysis.alternatives = this.generateAlternatives(content, analysis.risks);

      // Log the analysis
      await this.logAnalysis(userId, analysis, context);

      return analysis;
    } catch (error) {
      console.error('Error analyzing content safety:', error);
      throw new Error('Failed to analyze content safety');
    }
  }

  /**
   * Analyze harassment risk
   */
  async analyzeHarassmentRisk(content, profile) {
    const contentLower = content.toLowerCase();
    const risks = {
      score: 0,
      triggers: [],
      severity: 'low'
    };

    // Check for direct harassment
    this.harassmentPatterns.direct.forEach(pattern => {
      if (contentLower.includes(pattern)) {
        risks.triggers.push({
          type: 'direct_harassment',
          pattern,
          severity: 'high'
        });
        risks.score += 0.4;
      }
    });

    // Check for indirect harassment
    this.harassmentPatterns.indirect.forEach(pattern => {
      if (contentLower.includes(pattern)) {
        risks.triggers.push({
          type: 'indirect_harassment',
          pattern,
          severity: 'medium'
        });
        risks.score += 0.2;
      }
    });

    // Check for threatening language
    this.harassmentPatterns.threatening.forEach(pattern => {
      if (contentLower.includes(pattern)) {
        risks.triggers.push({
          type: 'threatening',
          pattern,
          severity: 'critical'
        });
        risks.score += 0.6;
      }
    });

    // Adjust based on user's risk tolerance
    if (profile.riskTolerance === 'conservative') {
      risks.score *= 1.2;
    } else if (profile.riskTolerance === 'open') {
      risks.score *= 0.8;
    }

    // Determine severity
    if (risks.score >= 0.7) {
      risks.severity = 'critical';
    } else if (risks.score >= 0.4) {
      risks.severity = 'high';
    } else if (risks.score >= 0.2) {
      risks.severity = 'medium';
    }

    return risks;
  }

  /**
   * Analyze privacy risk
   */
  async analyzePrivacyRisk(content, profile) {
    const risks = {
      score: 0,
      exposures: [],
      severity: 'low'
    };

    // Check for privacy patterns
    Object.entries(this.privacyPatterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        risks.exposures.push({
          type,
          count: matches.length,
          examples: matches.slice(0, 3), // Show first 3 examples
          severity: this.getPrivacySeverity(type)
        });
        risks.score += this.getPrivacyRiskScore(type, matches.length);
      }
    });

    // Check for personal information patterns
    const personalPatterns = [
      /\bmy\s+(?:name|email|phone|address|location)\s+is\b/gi,
      /\bI\s+live\s+in\b/gi,
      /\bI\s+work\s+at\b/gi,
      /\bmy\s+company\s+is\b/gi
    ];

    personalPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        risks.exposures.push({
          type: 'personal_info',
          count: matches.length,
          examples: matches.slice(0, 2),
          severity: 'medium'
        });
        risks.score += 0.3;
      }
    });

    // Determine severity
    if (risks.score >= 0.8) {
      risks.severity = 'critical';
    } else if (risks.score >= 0.5) {
      risks.severity = 'high';
    } else if (risks.score >= 0.2) {
      risks.severity = 'medium';
    }

    return risks;
  }

  /**
   * Analyze professional risk
   */
  async analyzeProfessionalRisk(content, profile) {
    const contentLower = content.toLowerCase();
    const risks = {
      score: 0,
      issues: [],
      severity: 'low'
    };

    // Check for unprofessional language
    this.professionalRisks.unprofessional.forEach(word => {
      if (contentLower.includes(word)) {
        risks.issues.push({
          type: 'unprofessional_language',
          word,
          severity: 'medium'
        });
        risks.score += 0.2;
      }
    });

    // Check for controversial topics
    this.professionalRisks.controversial.forEach(topic => {
      if (contentLower.includes(topic)) {
        risks.issues.push({
          type: 'controversial_topic',
          topic,
          severity: 'high'
        });
        risks.score += 0.3;
      }
    });

    // Check for overly personal content
    this.professionalRisks.personal.forEach(pattern => {
      if (contentLower.includes(pattern)) {
        risks.issues.push({
          type: 'personal_content',
          pattern,
          severity: 'low'
        });
        risks.score += 0.1;
      }
    });

    // Determine severity
    if (risks.score >= 0.6) {
      risks.severity = 'high';
    } else if (risks.score >= 0.3) {
      risks.severity = 'medium';
    }

    return risks;
  }

  /**
   * Analyze timing risk
   */
  async analyzeTimingRisk(context, profile) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    const risks = {
      score: 0,
      factors: [],
      severity: 'low'
    };

    // Check for late night posting
    if (hour >= this.timingRisks.lateNight.start || hour <= this.timingRisks.lateNight.end) {
      risks.factors.push({
        type: 'late_night',
        risk: this.timingRisks.lateNight.risk,
        description: 'Posting during late night hours may receive less engagement'
      });
      risks.score += this.timingRisks.lateNight.risk;
    }

    // Check for weekend posting
    if (day === 0 || day === 6) {
      risks.factors.push({
        type: 'weekend',
        risk: this.timingRisks.weekend.risk,
        description: 'Weekend posts may have different engagement patterns'
      });
      risks.score += this.timingRisks.weekend.risk;
    }

    // Check for early morning posting
    if (hour >= this.timingRisks.earlyMorning.start && hour <= this.timingRisks.earlyMorning.end) {
      risks.factors.push({
        type: 'early_morning',
        risk: this.timingRisks.earlyMorning.risk,
        description: 'Early morning posts may have limited reach'
      });
      risks.score += this.timingRisks.earlyMorning.risk;
    }

    // Determine severity
    if (risks.score >= 0.4) {
      risks.severity = 'medium';
    }

    return risks;
  }

  /**
   * Calculate overall risk score
   */
  calculateOverallRisk(risks) {
    const weights = {
      harassment: 0.4,
      privacy: 0.3,
      professional: 0.2,
      timing: 0.1
    };

    let totalRisk = 0;
    Object.entries(risks).forEach(([type, risk]) => {
      totalRisk += risk.score * (weights[type] || 0);
    });

    return Math.min(1, totalRisk);
  }

  /**
   * Generate safety recommendations
   */
  generateRecommendations(risks, profile) {
    const recommendations = [];

    // Harassment recommendations
    if (risks.harassment.score > 0.3) {
      recommendations.push({
        type: 'harassment',
        priority: 'high',
        message: 'Content may trigger negative responses. Consider rephrasing to be more neutral.',
        action: 'rephrase'
      });
    }

    // Privacy recommendations
    if (risks.privacy.score > 0.2) {
      recommendations.push({
        type: 'privacy',
        priority: 'high',
        message: 'Content contains sensitive information. Remove personal details before posting.',
        action: 'remove_personal_info'
      });
    }

    // Professional recommendations
    if (risks.professional.score > 0.3) {
      recommendations.push({
        type: 'professional',
        priority: 'medium',
        message: 'Content may not align with professional image. Consider using more formal language.',
        action: 'professional_tone'
      });
    }

    // Timing recommendations
    if (risks.timing.score > 0.3) {
      recommendations.push({
        type: 'timing',
        priority: 'low',
        message: 'Consider posting at a different time for better engagement.',
        action: 'reschedule'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate alternative content suggestions
   */
  generateAlternatives(content, risks) {
    const alternatives = [];

    // Generate harassment-free alternative
    if (risks.harassment.score > 0.3) {
      alternatives.push({
        type: 'harassment_free',
        content: this.generateNeutralAlternative(content),
        description: 'More neutral version that avoids potentially triggering language'
      });
    }

    // Generate privacy-safe alternative
    if (risks.privacy.score > 0.2) {
      alternatives.push({
        type: 'privacy_safe',
        content: this.removePersonalInfo(content),
        description: 'Version with personal information removed'
      });
    }

    // Generate professional alternative
    if (risks.professional.score > 0.3) {
      alternatives.push({
        type: 'professional',
        content: this.makeProfessional(content),
        description: 'More professional version suitable for business context'
      });
    }

    return alternatives;
  }

  /**
   * Helper methods for content modification
   */
  generateNeutralAlternative(content) {
    // Simple implementation - in reality, this would use AI/ML
    let alternative = content;
    
    this.harassmentPatterns.direct.forEach(pattern => {
      const regex = new RegExp(`\\b${pattern}\\b`, 'gi');
      alternative = alternative.replace(regex, '[neutral alternative]');
    });

    return alternative;
  }

  removePersonalInfo(content) {
    let cleaned = content;
    
    Object.values(this.privacyPatterns).forEach(pattern => {
      cleaned = cleaned.replace(pattern, '[REDACTED]');
    });

    return cleaned;
  }

  makeProfessional(content) {
    let professional = content;
    
    this.professionalRisks.unprofessional.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      professional = professional.replace(regex, '[professional alternative]');
    });

    return professional;
  }

  /**
   * Get privacy severity level
   */
  getPrivacySeverity(type) {
    const severityMap = {
      phone: 'high',
      email: 'high',
      ip: 'medium',
      url: 'low',
      address: 'high',
      ssn: 'critical',
      creditCard: 'critical'
    };
    return severityMap[type] || 'medium';
  }

  /**
   * Get privacy risk score
   */
  getPrivacyRiskScore(type, count) {
    const baseScores = {
      phone: 0.3,
      email: 0.3,
      ip: 0.2,
      url: 0.1,
      address: 0.4,
      ssn: 0.8,
      creditCard: 0.8
    };
    
    const baseScore = baseScores[type] || 0.2;
    return Math.min(1, baseScore * count);
  }

  /**
   * Get user safety profile
   */
  async getUserSafetyProfile(userId) {
    try {
      const profile = await SafetyProfile.findOne({ userId, isActive: true });
      if (!profile) {
        // Return default profile
        return {
          riskTolerance: 'moderate',
          vulnerabilityFactors: [],
          preferredProtections: []
        };
      }
      return profile;
    } catch (error) {
      console.error('Error getting user safety profile:', error);
      return {
        riskTolerance: 'moderate',
        vulnerabilityFactors: [],
        preferredProtections: []
      };
    }
  }

  /**
   * Log content analysis
   */
  async logAnalysis(userId, analysis, context) {
    try {
      const log = new SafetyAuditLog({
        userId,
        actionType: 'content_analysis',
        actionDetails: {
          description: `Content analyzed for ${analysis.platform}`,
          context: 'content_creation',
          platform: 'web',
          feature: 'content_analyzer'
        },
        systemDecision: true,
        userOverride: false,
        riskLevel: analysis.overallRisk > 0.7 ? 'high' : analysis.overallRisk > 0.4 ? 'medium' : 'low',
        outcome: analysis.overallRisk > 0.5 ? 'warning' : 'success',
        metadata: {
          contentLength: analysis.contentId ? 'analyzed' : 'unknown',
          platform: analysis.platform,
          riskScore: analysis.overallRisk,
          confidence: analysis.confidence
        }
      });

      await log.save();
    } catch (error) {
      console.error('Error logging content analysis:', error);
      // Don't throw error for logging failures
    }
  }
}

module.exports = new ContentSafetyAnalyzer();
