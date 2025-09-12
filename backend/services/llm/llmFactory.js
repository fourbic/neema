/**
 * LLM Factory
 * Creates and manages LLM adapters based on configuration
 */
const OpenRouterAdapter = require('./openRouterAdapter');
const OpenAIAdapter = require('./openAIAdapter');
const AnthropicAdapter = require('./anthropicAdapter');
const QwenAdapter = require('./qwenAdapter');

class LLMFactory {
  constructor() {
    // Initialize adapters with different configurations if needed
    this.adapters = {
      'openrouter': new OpenRouterAdapter(),
      'openai': new OpenAIAdapter(),
      'anthropic': new AnthropicAdapter(),
      'qwen': new QwenAdapter()
    };

    // Set default adapter based on environment variable or fallback to OpenRouter
    this.defaultProvider = process.env.DEFAULT_LLM_PROVIDER || 'openrouter';
    
    console.log(`Default LLM provider: ${this.defaultProvider}`);
    console.log(`DEFAULT_MODEL from env: ${process.env.DEFAULT_MODEL}`);

    // Load all environment configurations
    this._loadConfigurations();
  }

  /**
   * Load configurations for all adapters
   */
  _loadConfigurations() {
    // You can load additional configurations here from env or config files
    // For now, adapters are initialized with default configurations
  }

  /**
   * Get adapter by provider name
   * 
   * @param {string} provider Provider name (openrouter, openai, anthropic, qwen)
   * @returns {LLMAdapter} The LLM adapter
   */
  getAdapter(provider = null) {
    const adapterName = provider || this.defaultProvider;
    
    if (!this.adapters[adapterName]) {
      throw new Error(`Unknown LLM provider: ${adapterName}`);
    }
    
    return this.adapters[adapterName];
  }

  /**
   * Get the default adapter
   * 
   * @returns {LLMAdapter} The default LLM adapter
   */
  getDefaultAdapter() {
    return this.getAdapter(this.defaultProvider);
  }

  /**
   * Check if a specific provider is properly configured
   * 
   * @param {string} provider Provider name
   * @returns {boolean} True if configured correctly
   */
  isProviderConfigured(provider) {
    try {
      const adapter = this.getAdapter(provider);
      return adapter.isConfigured();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all available adapters
   * 
   * @returns {Object} Object with provider names as keys and adapter instances as values
   */
  getAllAdapters() {
    return this.adapters;
  }

  /**
   * Get a list of all configured providers
   * 
   * @returns {Array<string>} List of configured provider names
   */
  getConfiguredProviders() {
    return Object.keys(this.adapters).filter(provider => {
      return this.isProviderConfigured(provider);
    });
  }

  /**
   * Get a list of all available models across all configured providers
   * 
   * @returns {Array<Object>} List of model information objects with provider information
   */
  getAllAvailableModels() {
    const providers = this.getConfiguredProviders();
    let allModels = [];
    
    providers.forEach(provider => {
      const adapter = this.getAdapter(provider);
      const models = adapter.getAvailableModels().map(model => ({
        ...model,
        providerId: provider
      }));
      
      allModels = [...allModels, ...models];
    });
    
    return allModels;
  }
}

// Export a singleton instance
module.exports = new LLMFactory();