/**
 * AI Service for Neema
 * Handles all AI-related functionality using the LLM adapter system
 */
const llmFactory = require('./llm/llmFactory');
const safetyService = require('./safetyService');
const contentSafetyAnalyzer = require('./contentSafetyAnalyzer');

class AiService {
  constructor() {
    // Set default model preferences for different tasks
    this.modelPreferences = {
      chat: {
        default: process.env.DEFAULT_CHAT_MODEL || process.env.DEFAULT_QWEN_MODEL || 'anthropic/claude-3-haiku',
        fallback: 'openai/gpt-3.5-turbo',
      },
      productivity: {
        default: process.env.DEFAULT_PRODUCTIVITY_MODEL || process.env.DEFAULT_QWEN_MODEL || 'anthropic/claude-3-haiku',
        fallback: 'openai/gpt-3.5-turbo',
      },
      summarization: {
        default: process.env.DEFAULT_SUMMARIZATION_MODEL || process.env.DEFAULT_QWEN_MODEL || 'anthropic/claude-3-haiku',
        fallback: 'openai/gpt-3.5-turbo',
      }
    };
  }

  /**
   * Select appropriate LLM adapter and model based on the request
   * 
   * @param {string} requestedModel Model ID requested by user (can include provider prefix)
   * @param {string} taskType Type of task (chat, productivity, summarization)
   * @returns {Object} Object containing adapter and model ID
   */
  _selectAdapter(requestedModel, taskType = 'chat') {
    // Try to extract provider and model from requestedModel (format: provider/model)
    let provider = null;
    let modelId = requestedModel;

    if (requestedModel && requestedModel.includes('/')) {
      const parts = requestedModel.split('/');
      provider = parts[0];
      modelId = parts[1];
    }

    // If provider specified and configured, use it
    if (provider && llmFactory.isProviderConfigured(provider)) {
      const adapter = llmFactory.getAdapter(provider);
      // Check if the model is available in this provider
      if (adapter.getAvailableModels().some(m => m.id === modelId)) {
        return { adapter, modelId };
      }
    }

    // If no valid provider/model combination was found, use default for this task type
    const defaultModel = this.modelPreferences[taskType]?.default;
    
    if (defaultModel && defaultModel.includes('/')) {
      const parts = defaultModel.split('/');
      provider = parts[0];
      modelId = parts[1];
      
      if (llmFactory.isProviderConfigured(provider)) {
        return { adapter: llmFactory.getAdapter(provider), modelId };
      }
    }
    
    // Fall back to any configured provider
    const configuredProviders = llmFactory.getConfiguredProviders();
    if (configuredProviders.length > 0) {
      return { 
        adapter: llmFactory.getAdapter(configuredProviders[0]),
        modelId: null // Use the adapter's default model 
      };
    }
    
    throw new Error('No configured LLM providers available');
  }

  /**
   * Process error and log details
   * 
   * @param {Error} error Error object
   * @param {string} operation Name of the operation that failed
   * @returns {Object} Standardized error object
   */
  _handleError(error, operation) {
    console.error(`AI service error during ${operation}:`, error.message);
    
    // Return standardized error response
    return { 
      error: `Failed to ${operation}`, 
      details: error.message 
    };
  }

  /**
   * Generate chat response with safety processing
   * 
   * @param {string} message User message
   * @param {Array} history Chat history
   * @param {Object} context User context
   * @param {string} model Requested model
   * @param {string} userId User ID for safety analysis
   * @returns {Object} Response containing text or error
   */
  async generateChatResponse(message, history = [], context = {}, model = null, userId = null) {
    try {
      // Analyze user message for safety risks if userId provided
      let safetyAnalysis = null;
      if (userId) {
        safetyAnalysis = await contentSafetyAnalyzer.analyzeContent(
          userId, 
          message, 
          'chat', 
          { contentId: 'chat_message', userId }
        );
      }

      // Format system prompt with context and safety considerations
      const systemPrompt = `You are Neema, a Safety-First AI assistant for women entrepreneurs and content creators in Kenya. 
      Your goal is to assist users with tasks, scheduling, communication, and insights while prioritizing their safety and well-being.
      Always consider safety implications in your responses and provide supportive, empowering guidance.
      Be concise, helpful, proactive, and culturally aware of Kenyan context.
      Current Date/Time: ${new Date().toISOString()}
      User Context: ${JSON.stringify(context, null, 2)}
      ${safetyAnalysis && safetyAnalysis.overallRisk > 0.5 ? 
        `SAFETY ALERT: User message contains potential risks. Be extra supportive and consider safety implications.` : ''}`;

      // Format messages for LLM
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message }
      ];

      // Select appropriate adapter and model
      const { adapter, modelId } = this._selectAdapter(model, 'chat');

      // Generate response
      const response = await adapter.chatCompletion(messages, { 
        model: modelId,
        temperature: 0.7
      });

      // Analyze response for safety if userId provided
      let responseSafetyAnalysis = null;
      if (userId) {
        responseSafetyAnalysis = await contentSafetyAnalyzer.analyzeContent(
          userId, 
          response, 
          'ai_response', 
          { contentId: 'ai_response', userId }
        );
      }

      return { 
        response: response.trim(),
        safetyAnalysis,
        responseSafetyAnalysis
      };
    } catch (error) {
      return this._handleError(error, 'generate chat response');
    }
  }

  /**
   * Suggest task priorities
   * 
   * @param {Array} tasks User tasks
   * @param {Array} calendarEvents Calendar events
   * @returns {Object} Task priorities or error
   */
  async suggestTaskPriorities(tasks, calendarEvents) {
    try {
      // Build detailed prompt
      const taskDetails = tasks.map(task => {
        return `Task: ${task.title}
Description: ${task.description || 'No description'}
Due date: ${task.dueDate ? new Date(task.dueDate).toISOString() : 'No due date'}
Status: ${task.status}
Current priority: ${task.priority}`;
      }).join('\n\n');

      const calendarContext = calendarEvents.map(event => {
        return `Event: ${event.title}
Start: ${new Date(event.startTime).toISOString()}
End: ${new Date(event.endTime).toISOString()}`;
      }).join('\n\n');

      const prompt = `Please analyze these tasks and suggest priorities (urgent, high, medium, low) based on due dates, descriptions, and calendar events. Provide brief reasoning for each.

TASKS:
${taskDetails}

CALENDAR EVENTS:
${calendarContext}

Please return your analysis in JSON format with task IDs and suggested priorities:
{
  "taskPriorities": [
    {"id": "task_id", "suggestedPriority": "high", "reasoning": "Due soon and conflicts with calendar event"}
  ]
}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(null, 'productivity');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that helps prioritize tasks based on urgency, importance, and calendar context.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.2
      });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse priorities from AI response');
      }
      
      const json = JSON.parse(jsonMatch[0]);
      return json;
    } catch (error) {
      return this._handleError(error, 'suggest task priorities');
    }
  }

  /**
   * Summarize a note
   * 
   * @param {Object} note Note object with content
   * @returns {Object} Summary or error
   */
  async summarizeNote(note) {
    try {
      const prompt = `Please summarize the following note in 2-3 sentences, capturing the key points:\n\n${note.content}`;
      
      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(null, 'summarization');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that creates concise, accurate summaries of notes.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.3
      });

      return { summary: response.trim() };
    } catch (error) {
      return this._handleError(error, 'generate note summary');
    }
  }

  /**
   * Generate email reply
   * 
   * @param {Object} email Email object with content
   * @param {Object} userContext User context
   * @returns {Object} Email reply or error
   */
  async generateEmailReply(email, userContext) {
    try {
      const prompt = `Please generate a professional reply to the following email. 
      Use the user's context and previous communication style to match their tone.
      
      Email: ${email.content}
      
      User context: 
      Name: ${userContext.name}
      Role: ${userContext.role}
      Previous communication style: ${userContext.style}`;
      
      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(null, 'chat');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that helps craft professional email responses that match the user\'s communication style.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.4
      });

      return { reply: response.trim() };
    } catch (error) {
      return this._handleError(error, 'generate email reply');
    }
  }

  /**
   * Generate LinkedIn post
   * 
   * @param {string} topic Post topic
   * @param {string} style Post style
   * @param {number} length Word count
   * @returns {Object} LinkedIn post or error
   */
  async generateLinkedInPost(topic, style, length) {
    try {
      const prompt = `Create a professional LinkedIn post about ${topic}. 
      The post should be in a ${style} style and approximately ${length} words long.`;
      
      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(null, 'chat');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that creates engaging and professional LinkedIn posts.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.7
      });

      return { post: response.trim() };
    } catch (error) {
      return this._handleError(error, 'generate LinkedIn post');
    }
  }

  /**
   * Suggest tasks based on context
   * 
   * @param {string} userId User ID
   * @param {Object} context User context
   * @param {string} model Requested model
   * @returns {Object} Task suggestions or error
   */
  async suggestTasks(userId, context = {}, model = null) {
    try {
      const prompt = `Based on the user's context (recent tasks, upcoming events, unread emails, productivity stats, preferences), suggest 3-5 actionable tasks they might want to add. Provide title, suggested priority (high, medium, low), and optionally a due date (YYYY-MM-DD). Format the response as a JSON array of objects: 
[{"title": "Task Title", "priority": "medium", "dueDate": "YYYY-MM-DD"}]

User Context:
${JSON.stringify(context, null, 2)}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'productivity');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that suggests relevant tasks based on user context. Respond ONLY with the JSON array.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.5
      });

      // Attempt to parse the JSON response
      try {
        const suggestions = JSON.parse(response.trim());
        return { suggestions };
      } catch (parseError) {
        console.error('AI service error parsing task suggestions:', parseError, 'Raw response:', response);
        return { error: 'Failed to parse task suggestions from AI response' };
      }
    } catch (error) {
      return this._handleError(error, 'suggest tasks');
    }
  }

  /**
   * Analyze productivity data
   * 
   * @param {string} userId User ID
   * @param {Object} timeRange Time range
   * @param {Array} data Productivity data
   * @param {string} model Requested model
   * @returns {Object} Analysis or error
   */
  async analyzeProductivity(userId, timeRange, data, model = null) {
    try {
      const prompt = `Analyze the following productivity data for user ${userId} within the time range ${JSON.stringify(timeRange)}. 
Data: ${JSON.stringify(data, null, 2)}
Provide insights on focus areas, potential distractions, and suggestions for improvement. Format the response as a JSON object: {"insights": "...", "suggestions": ["..."]}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'productivity');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that analyzes productivity data and provides actionable insights.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.4
      });

      try {
        const analysis = JSON.parse(response.trim());
        return { analysis };
      } catch (parseError) {
        console.error('AI service error parsing productivity analysis:', parseError, 'Raw response:', response);
        return { error: 'Failed to parse productivity analysis from AI response' };
      }
    } catch (error) {
      return this._handleError(error, 'analyze productivity');
    }
  }

  /**
   * Summarize emails
   * 
   * @param {Array} emails Email array
   * @param {number} maxLength Maximum summary length
   * @param {string} model Requested model
   * @returns {Object} Summary or error
   */
  async summarizeEmails(emails, maxLength = 100, model = null) {
    try {
      const emailContent = emails.map((e, index) => `Email ${index + 1}:
Subject: ${e.subject}
From: ${e.from}
Snippet: ${e.snippet}
---
`).join('\n');
     
      const prompt = `Summarize the key points from the following emails concisely (target ${maxLength} words total):

${emailContent}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'summarization');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: `You are an AI assistant that summarizes email content concisely. Target total summary length: ${maxLength} words.` },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.3
      });

      return { summary: response.trim() };
    } catch (error) {
      return this._handleError(error, 'summarize emails');
    }
  }

  /**
   * Generate daily summary
   * 
   * @param {string} userId User ID
   * @param {string} date Date for summary
   * @param {string} model Requested model
   * @returns {Object} Daily summary or error
   */
  async generateDailySummary(userId, date, model = null) {
    try {
      // In a real app, fetch relevant data for the user and date (tasks, events, etc.)
      // For now, we'll use a placeholder context
      const context = {
        tasks: [{ title: 'Prepare presentation', status: 'in progress' }, { title: 'Team meeting', status: 'scheduled' }],
        events: [{ title: 'Client call', time: '14:00' }],
        date: date || new Date().toISOString().split('T')[0]
      };

      const prompt = `Generate a brief daily summary for user ${userId} for ${context.date}. Include a greeting, key focus areas based on tasks/events, top 1-2 tasks, upcoming events, and a brief productivity insight or tip. 
Context: ${JSON.stringify(context, null, 2)}
Format the response as a JSON object: {"greeting": "...", "focusAreas": ["..."], "topTasks": [{"title": "..."}], "upcomingEvents": [{"title": "...", "time": "..."}], "insights": "..."}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'productivity');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are an AI assistant that generates helpful daily summaries for users.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.6
      });

      try {
        const summary = JSON.parse(response.trim());
        return summary;
      } catch (parseError) {
        console.error('AI service error parsing daily summary:', parseError, 'Raw response:', response);
        return { error: 'Failed to parse daily summary from AI response' };
      }
    } catch (error) {
      return this._handleError(error, 'generate daily summary');
    }
  }

  /**
   * Get available models for the user interface
   * 
   * @returns {Array} Available models with provider information
   */
  getAvailableModels() {
    try {
      return llmFactory.getAllAvailableModels();
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  /**
   * Get active providers configuration
   * 
   * @returns {Object} Provider configuration status
   */
  getProvidersStatus() {
    try {
      const providers = Object.keys(llmFactory.getAllAdapters());
      const status = {};
      
      providers.forEach(provider => {
        status[provider] = {
          configured: llmFactory.isProviderConfigured(provider),
          isDefault: provider === process.env.DEFAULT_LLM_PROVIDER,
        };
      });
      
      return status;
    } catch (error) {
      console.error('Error getting provider status:', error);
      return {};
    }
  }

  /**
   * Generate safety guidance for user
   * 
   * @param {string} userId User ID
   * @param {Object} context User context and current activity
   * @param {string} model Requested model
   * @returns {Object} Safety guidance or error
   */
  async generateSafetyGuidance(userId, context = {}, model = null) {
    try {
      const safetyProfile = await safetyService.getSafetyProfile(userId);
      const relevantThreats = await safetyService.getRelevantThreats(userId, 5);
      
      const prompt = `As Neema's AI Safety Mentor, provide personalized safety guidance for a woman entrepreneur in Kenya.

User Safety Profile:
- Risk Tolerance: ${safetyProfile.riskTolerance}
- Protection Level: ${safetyProfile.protectionLevel}
- Vulnerability Factors: ${safetyProfile.vulnerabilityFactors.join(', ')}
- Cultural Context: ${safetyProfile.culturalContext}

Current Context:
${JSON.stringify(context, null, 2)}

Relevant Community Threats:
${relevantThreats.map(threat => `- ${threat.threatCategory}: ${threat.threatDescription}`).join('\n')}

Provide:
1. Immediate safety actions (if any risks detected)
2. Preventive measures for the current context
3. Educational content relevant to their situation
4. Local support resources in Kenya

Format as JSON:
{
  "immediateActions": ["action1", "action2"],
  "preventiveMeasures": ["measure1", "measure2"],
  "educationalContent": "brief educational tip",
  "supportResources": ["resource1", "resource2"]
}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'chat');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are Neema\'s AI Safety Mentor, providing personalized safety guidance for women entrepreneurs in Kenya.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.3
      });

      try {
        const guidance = JSON.parse(response.trim());
        return { guidance };
      } catch (parseError) {
        console.error('AI service error parsing safety guidance:', parseError, 'Raw response:', response);
        return { error: 'Failed to parse safety guidance from AI response' };
      }
    } catch (error) {
      return this._handleError(error, 'generate safety guidance');
    }
  }

  /**
   * Analyze content for safety before posting
   * 
   * @param {string} userId User ID
   * @param {string} content Content to analyze
   * @param {string} platform Target platform
   * @param {Object} context Additional context
   * @returns {Object} Safety analysis and recommendations
   */
  async analyzeContentForSafety(userId, content, platform, context = {}) {
    try {
      return await contentSafetyAnalyzer.analyzeContent(userId, content, platform, context);
    } catch (error) {
      return this._handleError(error, 'analyze content for safety');
    }
  }

  /**
   * Generate safe alternative content
   * 
   * @param {string} userId User ID
   * @param {string} originalContent Original content
   * @param {string} platform Target platform
   * @param {Object} safetyAnalysis Safety analysis results
   * @param {string} model Requested model
   * @returns {Object} Safe alternative content or error
   */
  async generateSafeAlternative(userId, originalContent, platform, safetyAnalysis, model = null) {
    try {
      const prompt = `As Neema's AI Safety Assistant, help create a safe alternative to this content for ${platform}.

Original Content:
"${originalContent}"

Safety Analysis Results:
- Harassment Risk: ${safetyAnalysis.risks.harassment.severity}
- Privacy Risk: ${safetyAnalysis.risks.privacy.severity}
- Professional Risk: ${safetyAnalysis.risks.professional.severity}
- Overall Risk: ${safetyAnalysis.overallRisk}

Recommendations:
${safetyAnalysis.recommendations.map(rec => `- ${rec.message}`).join('\n')}

Create a safe alternative that:
1. Maintains the original message intent
2. Removes or mitigates identified risks
3. Is appropriate for professional networking
4. Is culturally sensitive for Kenyan context
5. Empowers the user's business goals

Provide the safe alternative content and explain the changes made.`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'chat');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are Neema\'s AI Safety Assistant, helping create safe, professional content for women entrepreneurs.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.4
      });

      return { 
        safeAlternative: response.trim(),
        originalContent,
        platform,
        safetyAnalysis
      };
    } catch (error) {
      return this._handleError(error, 'generate safe alternative');
    }
  }

  /**
   * Generate emergency response guidance
   * 
   * @param {string} userId User ID
   * @param {string} emergencyType Type of emergency
   * @param {Object} context Emergency context
   * @param {string} model Requested model
   * @returns {Object} Emergency guidance or error
   */
  async generateEmergencyGuidance(userId, emergencyType, context = {}, model = null) {
    try {
      const safetyProfile = await safetyService.getSafetyProfile(userId);
      
      const prompt = `As Neema's Emergency Response AI, provide immediate guidance for a safety emergency.

Emergency Type: ${emergencyType}
User Context: ${JSON.stringify(context, null, 2)}
User Safety Profile: ${safetyProfile.protectionLevel} protection level

Provide immediate guidance including:
1. Immediate actions to take
2. Emergency contacts to reach
3. Documentation steps
4. Legal considerations for Kenya
5. Follow-up actions

Format as JSON:
{
  "immediateActions": ["action1", "action2"],
  "emergencyContacts": ["contact1", "contact2"],
  "documentationSteps": ["step1", "step2"],
  "legalConsiderations": "brief legal guidance",
  "followUpActions": ["action1", "action2"]
}`;

      // Select appropriate adapter
      const { adapter, modelId } = this._selectAdapter(model, 'chat');

      // Generate response
      const response = await adapter.chatCompletion([
        { role: 'system', content: 'You are Neema\'s Emergency Response AI, providing critical safety guidance for women entrepreneurs in Kenya.' },
        { role: 'user', content: prompt }
      ], { 
        model: modelId,
        temperature: 0.2
      });

      try {
        const guidance = JSON.parse(response.trim());
        return { guidance };
      } catch (parseError) {
        console.error('AI service error parsing emergency guidance:', parseError, 'Raw response:', response);
        return { error: 'Failed to parse emergency guidance from AI response' };
      }
    } catch (error) {
      return this._handleError(error, 'generate emergency guidance');
    }
  }
}

module.exports = new AiService();