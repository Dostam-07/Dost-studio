import { ollamaService } from './ollama';

export interface VisionAnalysis {
  layout: string;
  components: string[];
  structure: string;
  colors: string[];
  typography: string[];
  suggestions: string[];
}

export class VisionAgent {
  async validateOpenRouterKeys(model: string = 'deepseek/deepseek-chat'): Promise<{ valid: boolean; message: string }> {
    try {
      const result = await ollamaService.testOpenRouterKeys('', model);
      const validKeys = result.filter((r: any) => r.ok);
      if (validKeys.length === 0) {
        return {
          valid: false,
          message: 'No valid OpenRouter API keys found. Check your API keys in Settings → AI Provider → OpenRouter API Key.'
        };
      }
      return {
        valid: true,
        message: `${validKeys.length} valid key(s) available`
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        message: `Key validation failed: ${msg}`
      };
    }
  }

  async analyzeImage(
    imageBase64: string,
    model: string,
    instruction?: string
  ): Promise<VisionAnalysis> {
    const prompt = instruction || `Analyze this UI/wireframe/screenshot in detail.

Return valid JSON with:
- layout: describe the layout structure (e.g. "sidebar-left + main-content + top-nav")
- components: array of UI components you identify (e.g. ["header", "sidebar", "data-table", "button"])
- structure: describe the component tree/hierarchy
- colors: array of dominant colors (hex values)
- typography: array of font styles observed
- suggestions: array of implementation suggestions

Be specific and technical. This will be used to generate React + TailwindCSS code.`;

    const response = await this.generateWithImage(model, prompt, imageBase64);
    try {
      const cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned) as VisionAnalysis;
    } catch {
      return this.parseFallback(response);
    }
  }

  async analyzeAndSuggest(
    imageBase64: string,
    model: string
  ): Promise<{ componentMap: string; suggestedCode: string }> {
    const prompt = `You are analyzing a UI design image. 

Extract every visible UI element and describe:
1. Component hierarchy
2. Layout grid / flex structure  
3. State indicators (loading, empty, error, hover)
4. Responsive behavior clues
5. Exact component type for each element

Then output:
- componentMap: a JSON tree of the UI components
- suggestedCode: React + TailwindCSS code that reproduces this layout`;

    const response = await this.generateWithImage(model, prompt, imageBase64);
    const componentMap = response.includes('componentMap')
      ? response
      : 'Could not parse structured component map';

    return {
      componentMap,
      suggestedCode: response,
    };
  }

  private async generateWithImage(
    model: string,
    prompt: string,
    imageBase64: string
  ): Promise<string> {
    try {
      const response = await ollamaService.generate(model, prompt, undefined, undefined, [imageBase64]);
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from vision model');
      }
      return response;
    } catch (error) {
      console.error('Vision generation error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      
      // Check for API key exhaustion or invalid key errors
      if (msg.includes('402') || msg.includes('credit') || msg.includes('payment') || msg.includes('all keys exhausted')) {
        throw new Error(
          `OpenRouter API issue: ${msg}. Check your API keys in Settings → AI Provider → OpenRouter API Key. Ensure they are valid and have available credits.`
        );
      }
      
      if (msg.includes('does not support image input')) {
        throw new Error(
          `"${model}" does not support image input. Switch to a vision-capable model (e.g. minicpm-v, llava) in Settings → Models → Vision model.`
        );
      }
      throw error;
    }
  }

  private parseFallback(response: string): VisionAnalysis {
    return {
      layout: response.slice(0, 200),
      components: [],
      structure: '',
      colors: [],
      typography: [],
      suggestions: [response.slice(0, 300)],
    };
  }
}

export const visionAgent = new VisionAgent();
