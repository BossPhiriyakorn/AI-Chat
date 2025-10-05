const natural = require('natural');
const compromise = require('compromise');

class NLPService {
  constructor() {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.stopWords = this.getThaiStopWords();
    
    // Initialize natural language processing tools
    this.initializeNLP();
  }

  /**
   * Initialize NLP tools
   */
  initializeNLP() {
    // Configure natural language processing
    // Note: PorterStemmer.attach() is not available in newer versions
    // We'll use the stemmer directly in the stemWords method
  }

  /**
   * Get Thai stop words
   * @returns {Array} Array of stop words
   */
  getThaiStopWords() {
    return [
      'ที่', 'และ', 'ใน', 'ของ', 'เป็น', 'มี', 'จะ', 'ได้', 'ไม่', 'กับ',
      'หรือ', 'แต่', 'ก็', 'แล้ว', 'นี้', 'นั้น', 'ยัง', 'ให้', 'ไป', 'มา',
      'อยู่', 'ได้', 'จะ', 'ต้อง', 'ควร', 'อาจ', 'คง', 'น่าจะ', 'ดูเหมือน',
      'ค่ะ', 'ครับ', 'นะ', 'จ้ะ', 'จ้า', 'อ่า', 'เออ', 'อืม', 'อ้อ',
      'ครับ', 'ค่ะ', 'จ้ะ', 'จ้า', 'นะ', 'อ่า', 'เออ', 'อืม', 'อ้อ'
    ];
  }

  /**
   * Tokenize text
   * @param {string} text - Text to tokenize
   * @returns {Array} Array of tokens
   */
  tokenize(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    // Use compromise for better Thai text processing
    const doc = compromise(text);
    const tokens = doc.terms().out('array');
    
    return tokens.filter(token => token.length > 0);
  }

  /**
   * Remove stop words from tokens
   * @param {Array} tokens - Array of tokens
   * @returns {Array} Filtered tokens
   */
  removeStopWords(tokens) {
    return tokens.filter(token => 
      !this.stopWords.includes(token.toLowerCase())
    );
  }

  /**
   * Stem words
   * @param {Array} tokens - Array of tokens
   * @returns {Array} Stemmed tokens
   */
  stemWords(tokens) {
    return tokens.map(token => {
      try {
        // ใช้ PorterStemmer โดยตรงแทนการใช้ attach()
        return natural.PorterStemmer.stem(token);
      } catch (error) {
        return token;
      }
    });
  }

  /**
   * Preprocess text for analysis
   * @param {string} text - Text to preprocess
   * @returns {Array} Preprocessed tokens
   */
  preprocessText(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Clean text
    let cleanText = text
      .toLowerCase()
      .replace(/[^\u0E00-\u0E7F\s\w]/g, '') // Keep only Thai characters, spaces, and alphanumeric
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // Tokenize
    const tokens = this.tokenize(cleanText);
    
    // Remove stop words
    const filteredTokens = this.removeStopWords(tokens);
    
    // Stem words
    const stemmedTokens = this.stemWords(filteredTokens);
    
    return stemmedTokens.filter(token => token.length > 1);
  }

  /**
   * Calculate similarity between two texts
   * @param {string} text1 - First text
   * @param {string} text2 - Second text
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(text1, text2) {
    if (!text1 || !text2) {
      return 0;
    }

    const tokens1 = this.preprocessText(text1);
    const tokens2 = this.preprocessText(text2);

    if (tokens1.length === 0 || tokens2.length === 0) {
      return 0;
    }

    // Calculate Jaccard similarity
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Find similar keywords
   * @param {string} userMessage - User's message
   * @param {Array} keywords - Array of keywords to search
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Array} Array of similar keywords with scores
   */
  findSimilarKeywords(userMessage, keywords, threshold = 0.3) {
    const similarities = [];

    for (const keyword of keywords) {
      const similarity = this.calculateSimilarity(userMessage, keyword);
      
      if (similarity >= threshold) {
        similarities.push({
          keyword: keyword,
          similarity: similarity
        });
      }
    }

    // Sort by similarity score (descending)
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Detect question type
   * @param {string} text - Text to analyze
   * @returns {Object} Question type analysis
   */
  detectQuestionType(text) {
    if (!text || typeof text !== 'string') {
      return { type: 'unknown', confidence: 0 };
    }

    const lowerText = text.toLowerCase();
    
    // Question words in Thai
    const questionWords = [
      'อะไร', 'อย่างไร', 'ทำไม', 'เมื่อไหร่', 'ที่ไหน', 'ใคร', 'เท่าไหร่',
      'กี่', 'หรือไม่', 'ใช่ไหม', 'หรือเปล่า', 'ไหม', 'หรือ'
    ];

    // Check for question words
    const hasQuestionWord = questionWords.some(word => lowerText.includes(word));
    
    // Check for question marks
    const hasQuestionMark = text.includes('?') || text.includes('？');
    
    // Check for question patterns
    const questionPatterns = [
      /^(.+)\?$/, // Ends with ?
      /^(.+)\?$/, // Ends with ？
      /^(.+)\s+หรือ\s+(.+)$/, // A or B pattern
      /^(.+)\s+ไหม$/, // A ไหม pattern
      /^(.+)\s+หรือเปล่า$/, // A หรือเปล่า pattern
    ];

    const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(text));

    let confidence = 0;
    let type = 'statement';

    if (hasQuestionWord) {
      confidence += 0.4;
      type = 'question';
    }

    if (hasQuestionMark) {
      confidence += 0.3;
      type = 'question';
    }

    if (hasQuestionPattern) {
      confidence += 0.3;
      type = 'question';
    }

    // Determine specific question type
    if (type === 'question') {
      if (lowerText.includes('ราคา') || lowerText.includes('เท่าไหร่') || lowerText.includes('กี่')) {
        type = 'price_question';
      } else if (lowerText.includes('เวลา') || lowerText.includes('เมื่อไหร่')) {
        type = 'time_question';
      } else if (lowerText.includes('ที่ไหน') || lowerText.includes('สถานที่')) {
        type = 'location_question';
      } else if (lowerText.includes('อย่างไร') || lowerText.includes('วิธี')) {
        type = 'howto_question';
      } else if (lowerText.includes('ทำไม') || lowerText.includes('เพราะอะไร')) {
        type = 'why_question';
      }
    }

    return { type, confidence: Math.min(confidence, 1) };
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to extract keywords from
   * @param {number} maxKeywords - Maximum number of keywords to extract
   * @returns {Array} Array of keywords
   */
  extractKeywords(text, maxKeywords = 10) {
    const tokens = this.preprocessText(text);
    
    // Count word frequency
    const wordCount = {};
    tokens.forEach(token => {
      wordCount[token] = (wordCount[token] || 0) + 1;
    });

    // Sort by frequency
    const sortedWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Check if text contains specific keywords
   * @param {string} text - Text to check
   * @param {Array} keywords - Keywords to search for
   * @returns {boolean} Whether text contains any keyword
   */
  containsKeywords(text, keywords) {
    if (!text || !keywords || keywords.length === 0) {
      return false;
    }

    const lowerText = text.toLowerCase();
    return keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Normalize text for comparison
   * @param {string} text - Text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .toLowerCase()
      .replace(/[^\u0E00-\u0E7F\s\w]/g, '') // Keep only Thai characters, spaces, and alphanumeric
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }
}

module.exports = { NLPService };