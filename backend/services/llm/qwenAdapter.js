/**
 * Qwen LLM Adapter Implementation for DashScope API
 */
const axios = require('axios');
const LLMAdapter = require('./adapter');

class QwenAdapter extends LLMAdapter {
  constructor(config = {}) {
    super(config);
    this.endpoint = process.env.DASHSCOPE_HTTP_BASE_URL || 'https://dashscope-intl.aliyuncs.com/api/v1';
    this.apiKey = process.env.DASHSCOPE_API_KEY;
    this.defaultModel = config.defaultModel || process.env.DEFAULT_QWEN_MODEL || 'qwen-max';
    
    console.log(`Qwen default model: ${this.defaultModel}`);
    
    // Qwen-specific available models
    this.availableModels = [
      { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'Alibaba' },
      { id: 'qwen-plus', name: 'Qwen Plus', provider: 'Alibaba' },
      { id: 'qwen-max', name: 'Qwen Max', provider: 'Alibaba' },
      { id: 'qwen-max-longcontext', name: 'Qwen Max (Long Context)', provider: 'Alibaba' }
    ];
  }

  /**
   * Check if adapter is properly configured
   */
  isConfigured() {
    return Boolean(this.apiKey && this.endpoint);
  }

  /**
   * Get available models from Qwen
   */
  getAvailableModels() {
    return this.availableModels;
  }

  /**
   * Send chat completion request to Qwen via DashScope
   * 
   * @param {Array} messages Array of messages with role and content
   * @param {Object} options Additional options
   * @returns {Promise<string>} LLM response text
   */
  async chatCompletion(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('Qwen adapter is not properly configured. Check API key and endpoint.');
    }

    try {
      const model = options.model || this.defaultModel;
      const temperature = options.temperature !== undefined ? options.temperature : this.config.temperature;
      const maxTokens = options.maxTokens || this.config.maxTokens;

      // Format messages for Qwen chat API
      // Qwen expects an array of message objects with role and content
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await axios.post(
        `${this.endpoint}/services/aigc/text-generation/generation`,
        {
          model,
          input: {
            messages: formattedMessages
          },
          parameters: {
            temperature,
            max_tokens: maxTokens,
            ...options.parameters
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-DashScope-SSE': 'disable'
          }
        }
      );

      // Validate and extract response text
      if (
        response.data &&
        response.data.output &&
        response.data.output.text
      ) {
        return response.data.output.text;
      } else if (
        response.data &&
        response.data.choices &&
        response.data.choices[0] &&
        response.data.choices[0].message &&
        response.data.choices[0].message.content
      ) {
        return response.data.choices[0].message.content;
      } else {
        throw new Error('Invalid response format from Qwen API');
      }
    } catch (error) {
      // Enhanced error logging
      console.error('Qwen API Error:', error.message);
      
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw new Error(`Qwen API error: ${error.message}`);
    }
  }
}

module.exports = QwenAdapter;