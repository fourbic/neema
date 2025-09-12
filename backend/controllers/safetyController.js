const safetyService = require('../services/safetyService');
const aiService = require('../services/aiService');
const contentSafetyAnalyzer = require('../services/contentSafetyAnalyzer');
const SafetyIncident = require('../models/SafetyIncident');
const CommunityThreat = require('../models/CommunityThreat');

class SafetyController {
  /**
   * Get user's safety profile
   */
  async getSafetyProfile(req, res) {
    try {
      const userId = req.user._id;
      const profile = await safetyService.getSafetyProfile(userId);
      
      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error getting safety profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get safety profile'
      });
    }
  }

  /**
   * Create or update safety profile
   */
  async updateSafetyProfile(req, res) {
    try {
      const userId = req.user._id;
      const profileData = req.body;
      
      const profile = await safetyService.createSafetyProfile(userId, profileData);
      
      res.json({
        success: true,
        data: profile,
        message: 'Safety profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating safety profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update safety profile'
      });
    }
  }

  /**
   * Assess user's current risk level
   */
  async assessRisk(req, res) {
    try {
      const userId = req.user._id;
      
      const assessment = await safetyService.assessUserRisk(userId);
      
      res.json({
        success: true,
        data: assessment
      });
    } catch (error) {
      console.error('Error assessing risk:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assess risk level'
      });
    }
  }

  /**
   * Analyze content for safety risks
   */
  async analyzeContent(req, res) {
    try {
      const userId = req.user._id;
      const { content, platform, context } = req.body;
      
      if (!content || !platform) {
        return res.status(400).json({
          success: false,
          error: 'Content and platform are required'
        });
      }
      
      const analysis = await contentSafetyAnalyzer.analyzeContent(
        userId, 
        content, 
        platform, 
        context || {}
      );
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error analyzing content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze content safety'
      });
    }
  }

  /**
   * Generate safe alternative content
   */
  async generateSafeAlternative(req, res) {
    try {
      const userId = req.user._id;
      const { originalContent, platform, safetyAnalysis, model } = req.body;
      
      if (!originalContent || !platform || !safetyAnalysis) {
        return res.status(400).json({
          success: false,
          error: 'Original content, platform, and safety analysis are required'
        });
      }
      
      const result = await aiService.generateSafeAlternative(
        userId,
        originalContent,
        platform,
        safetyAnalysis,
        model
      );
      
      if (result.error) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error generating safe alternative:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate safe alternative'
      });
    }
  }

  /**
   * Report a safety incident
   */
  async reportIncident(req, res) {
    try {
      const userId = req.user._id;
      const incidentData = req.body;
      
      // Validate required fields
      if (!incidentData.incidentType || !incidentData.severityLevel || !incidentData.description) {
        return res.status(400).json({
          success: false,
          error: 'Incident type, severity level, and description are required'
        });
      }
      
      const incident = await safetyService.reportIncident(userId, incidentData);
      
      res.status(201).json({
        success: true,
        data: incident,
        message: 'Incident reported successfully'
      });
    } catch (error) {
      console.error('Error reporting incident:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to report incident'
      });
    }
  }

  /**
   * Get user's safety incidents
   */
  async getIncidents(req, res) {
    try {
      const userId = req.user._id;
      const { status, limit = 20, page = 1 } = req.query;
      
      const query = { userId, isActive: true };
      if (status) {
        query.status = status;
      }
      
      const incidents = await SafetyIncident.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
      
      const total = await SafetyIncident.countDocuments(query);
      
      res.json({
        success: true,
        data: {
          incidents,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total
          }
        }
      });
    } catch (error) {
      console.error('Error getting incidents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get incidents'
      });
    }
  }

  /**
   * Get community threats relevant to user
   */
  async getRelevantThreats(req, res) {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;
      
      const threats = await safetyService.getRelevantThreats(userId, parseInt(limit));
      
      res.json({
        success: true,
        data: threats
      });
    } catch (error) {
      console.error('Error getting relevant threats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get relevant threats'
      });
    }
  }

  /**
   * Get safety guidance from AI
   */
  async getSafetyGuidance(req, res) {
    try {
      const userId = req.user._id;
      const { context, model } = req.body;
      
      const result = await aiService.generateSafetyGuidance(userId, context || {}, model);
      
      if (result.error) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      res.json({
        success: true,
        data: result.guidance
      });
    } catch (error) {
      console.error('Error getting safety guidance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get safety guidance'
      });
    }
  }

  /**
   * Get emergency guidance
   */
  async getEmergencyGuidance(req, res) {
    try {
      const userId = req.user._id;
      const { emergencyType, context, model } = req.body;
      
      if (!emergencyType) {
        return res.status(400).json({
          success: false,
          error: 'Emergency type is required'
        });
      }
      
      const result = await aiService.generateEmergencyGuidance(
        userId, 
        emergencyType, 
        context || {}, 
        model
      );
      
      if (result.error) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
      res.json({
        success: true,
        data: result.guidance
      });
    } catch (error) {
      console.error('Error getting emergency guidance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get emergency guidance'
      });
    }
  }

  /**
   * Get safety statistics for user
   */
  async getSafetyStats(req, res) {
    try {
      const userId = req.user._id;
      const { timeRange = 30 } = req.query;
      
      const stats = await safetyService.getSafetyStats(userId, parseInt(timeRange));
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting safety stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get safety statistics'
      });
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(req, res) {
    try {
      const userId = req.user._id;
      const { incidentId } = req.params;
      const { status, resolution } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }
      
      const incident = await SafetyIncident.findOneAndUpdate(
        { _id: incidentId, userId },
        { 
          status,
          ...(resolution && { resolution }),
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!incident) {
        return res.status(404).json({
          success: false,
          error: 'Incident not found'
        });
      }
      
      res.json({
        success: true,
        data: incident,
        message: 'Incident status updated successfully'
      });
    } catch (error) {
      console.error('Error updating incident status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update incident status'
      });
    }
  }

  /**
   * Get trending community threats
   */
  async getTrendingThreats(req, res) {
    try {
      const { limit = 10, region } = req.query;
      
      const threats = await CommunityThreat.findTrending(parseInt(limit));
      
      res.json({
        success: true,
        data: threats
      });
    } catch (error) {
      console.error('Error getting trending threats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trending threats'
      });
    }
  }

  /**
   * Get threat statistics
   */
  async getThreatStats(req, res) {
    try {
      const { region, timeRange = 30 } = req.query;
      
      const stats = await CommunityThreat.getThreatStats(region, parseInt(timeRange));
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting threat stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get threat statistics'
      });
    }
  }
}

module.exports = new SafetyController();
