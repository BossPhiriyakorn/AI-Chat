const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
  }

  /**
   * Generate response using Gemini AI
   * @param {string} userMessage - User's message
   * @param {string} context - Additional context from Google Docs
   * @param {string} personality - Bot personality
   * @returns {Promise<string>} AI generated response
   */
  async generateResponse(userMessage, context = '', personality = '') {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt(userMessage, context, personality);
        
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        return text.trim();
      } catch (error) {
        console.error(`Error generating response with Gemini (attempt ${attempt}):`, error);
        
        // Check if it's a quota error
        if (error.message && error.message.includes('429')) {
          if (attempt < maxRetries) {
            console.log(`⏳ Quota exceeded, waiting ${retryDelay * attempt}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          } else {
            console.error('❌ Gemini API quota exceeded after all retries');
            throw new Error('Gemini API quota exceeded. Please try again later.');
          }
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }
  }

  /**
   * Build prompt for Gemini AI using data from Google Docs
   * @param {string} userMessage - User's message
   * @param {string} context - Context from Google Docs
   * @param {string} personality - Bot personality from Google Docs
   * @returns {string} Formatted prompt
   */
  buildPrompt(userMessage, context, personality) {
    // Build prompt using only data from Google Docs
    let prompt = '';
    
    // Add personality from Google Docs
    if (personality) {
      prompt += `${personality}\n\n`;
    }
    
    // Add context from Google Docs
    if (context) {
      prompt += `ข้อมูลบริบท: ${context}\n\n`;
    }
    
    // Add user message
    prompt += `คำถามจากลูกค้า: ${userMessage}\n\nคำตอบ:`;
    
    return prompt;
  }

  /**
   * Clean JSON response from AI to extract valid JSON
   * @param {string} response - Raw AI response
   * @returns {string} Cleaned JSON string
   */
  cleanJsonResponse(response) {
    if (!response) return '';
    
    // Remove markdown code block markers
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Try to find JSON object boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    
    return cleaned;
  }

  /**
   * Analyze text for keyword matching using data from Google Docs
   * @param {string} text - Text to analyze
   * @param {string} context - Context from Google Docs
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeText(text, context = '') {
    try {
      // Build prompt using context from Google Docs
      let prompt = '';
      if (context) {
        prompt += `ข้อมูลบริบท: ${context}\n\n`;
      }
      
      prompt += `วิเคราะห์ข้อความต่อไปนี้และระบุ:
1. คำสำคัญ (keywords) ที่อาจใช้ค้นหาในฐานข้อมูล
2. ประเภทของคำถาม (คำถามทั่วไป, คำถามเฉพาะ, คำถามเกี่ยวกับผลิตภัณฑ์/บริการ)
3. ระดับความเร่งด่วน (ปกติ, เร่งด่วน, ฉุกเฉิน)

ข้อความ: "${text}"

ตอบในรูปแบบ JSON:
{
  "keywords": ["คำ1", "คำ2"],
  "questionType": "ประเภทคำถาม",
  "urgency": "ระดับความเร่งด่วน",
  "intent": "เจตนาของผู้ถาม"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Try to parse JSON response
      try {
        const cleanedResponse = this.cleanJsonResponse(responseText);
        return JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.warn('Failed to parse Gemini JSON response:', parseError);
        console.warn('Raw response:', responseText);
        return {
          keywords: [],
          questionType: 'general',
          urgency: 'normal',
          intent: 'unknown'
        };
      }
    } catch (error) {
      console.error('Error analyzing text with Gemini:', error);
      return {
        keywords: [],
        questionType: 'general',
        urgency: 'normal',
        intent: 'unknown'
      };
    }
  }

  /**
   * Check if the service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      const result = await this.model.generateContent('test');
      return true;
    } catch (error) {
      console.error('Gemini service unavailable:', error);
      return false;
    }
  }
}

module.exports = { GeminiService };