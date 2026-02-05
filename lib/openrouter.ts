import { OpenRouterRequest, OpenRouterResponse } from '@/types/chat';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Default model 
const DEFAULT_MODEL = 'tngtech/deepseek-r1t2-chimera:free';

export class OpenRouterClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || OPENROUTER_API_KEY || '';
    this.model = model || DEFAULT_MODEL;

    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }
  }

  async chat(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Customer Service Chat',
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      return data;
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw error;
    }
  }

  async getCompletion(messages: OpenRouterRequest['messages']): Promise<string> {
    const response = await this.chat({ model: this.model, messages });
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response from OpenRouter');
    }

    return response.choices[0].message.content;
  }
}

// Export singleton instance
export const openRouterClient = new OpenRouterClient();