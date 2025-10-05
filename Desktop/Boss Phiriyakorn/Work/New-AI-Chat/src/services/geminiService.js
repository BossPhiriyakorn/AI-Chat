const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initializeGemini();
  }

  initializeGemini() {
    try {
      this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: config.gemini.model });
      logger.info('Gemini AI service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Gemini AI service:', error);
      throw error;
    }
  }

  async analyzeIntent(userMessage) {
    try {
      const prompt = `
        วิเคราะห์เจตนาของข้อความต่อไปนี้และระบุประเภท:
        
        ข้อความ: "${userMessage}"
        
        กรุณาตอบในรูปแบบ JSON:
        {
          "intent": "keyword_based" หรือ "general_inquiry",
          "confidence": 0.0-1.0,
          "extracted_keywords": ["คำสำคัญที่พบ"],
          "reasoning": "เหตุผลในการตัดสินใจ"
        }
        
        เกณฑ์การตัดสินใจ:
        - keyword_based: ข้อความมีลักษณะเป็นคำถามเฉพาะเจาะจง หรือมีคำสำคัญที่ชัดเจน
        - general_inquiry: ข้อความเป็นคำถามทั่วไปที่ต้องการคำอธิบายยาวๆ หรือข้อมูลเชิงลึก
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        logger.info('Intent analysis completed:', analysis);
        return analysis;
      } else {
        throw new Error('Failed to parse JSON response from Gemini');
      }
    } catch (error) {
      logger.error('Failed to analyze intent:', error);
      // Fallback to general inquiry if analysis fails
      return {
        intent: 'general_inquiry',
        confidence: 0.5,
        extracted_keywords: [],
        reasoning: 'Analysis failed, defaulting to general inquiry'
      };
    }
  }

  async generateResponse(userMessage, context = '') {
    try {
      const prompt = `
        คุณเป็นพนักงานบริการลูกค้าที่มีประสบการณ์และมีความรู้เกี่ยวกับธุรกิจนี้
        
        ${context ? `ข้อมูลบริบทของธุรกิจ:\n${context}\n` : ''}
        
        คำถามจากลูกค้า: "${userMessage}"
        
        กรุณาตอบคำถามด้วยความสุภาพ เป็นมิตร และให้ข้อมูลที่ถูกต้องและเป็นประโยชน์
        หากไม่แน่ใจในคำตอบ ให้บอกว่าคุณจะติดต่อทีมงานเพื่อให้ข้อมูลที่ถูกต้อง
        
        ตอบเป็นภาษาไทยที่เข้าใจง่าย และไม่เกิน 500 คำ
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Generated response from Gemini');
      return text.trim();
    } catch (error) {
      logger.error('Failed to generate response:', error);
      return 'ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้งค่ะ';
    }
  }

  async extractKeywords(userMessage) {
    try {
      const prompt = `
        สกัดคำสำคัญจากข้อความต่อไปนี้:
        
        ข้อความ: "${userMessage}"
        
        กรุณาตอบในรูปแบบ JSON:
        {
          "keywords": ["คำสำคัญ1", "คำสำคัญ2", "คำสำคัญ3"],
          "normalized_message": "ข้อความที่ปรับปรุงแล้ว"
        }
        
        หมายเหตุ:
        - สกัดคำสำคัญที่สำคัญที่สุด 3-5 คำ
        - ปรับปรุงข้อความให้เป็นรูปแบบมาตรฐาน (แก้ไขการพิมพ์ผิด)
        - ใช้คำสำคัญที่อาจพบในฐานข้อมูลคำตอบ
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extraction = JSON.parse(jsonMatch[0]);
        logger.info('Keyword extraction completed:', extraction);
        return extraction;
      } else {
        throw new Error('Failed to parse JSON response from Gemini');
      }
    } catch (error) {
      logger.error('Failed to extract keywords:', error);
      // Fallback to simple keyword extraction
      return {
        keywords: userMessage.split(/\s+/).slice(0, 5),
        normalized_message: userMessage
      };
    }
  }

  async generateFallbackResponse(userMessage) {
    try {
      const prompt = `
        คุณเป็นพนักงานบริการลูกค้าที่สุภาพและเป็นมิตร
        
        ลูกค้าส่งข้อความมา: "${userMessage}"
        
        แต่คุณไม่พบคำตอบที่เหมาะสมในฐานข้อมูล
        
        กรุณาตอบกลับด้วยความสุภาพและแนะนำให้ลูกค้าติดต่อทีมงานเพื่อรับความช่วยเหลือเพิ่มเติม
        
        ตอบเป็นภาษาไทยที่เข้าใจง่าย และไม่เกิน 200 คำ
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Generated fallback response from Gemini');
      return text.trim();
    } catch (error) {
      logger.error('Failed to generate fallback response:', error);
      return 'ขออภัยค่ะ เราไม่พบคำตอบที่เหมาะสมสำหรับคำถามนี้ กรุณาติดต่อทีมงานเพื่อรับความช่วยเหลือเพิ่มเติมค่ะ';
    }
  }
}

module.exports = new GeminiService();
