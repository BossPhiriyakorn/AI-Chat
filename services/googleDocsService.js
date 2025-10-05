const { google } = require('googleapis');
const fs = require('fs');

class GoogleDocsService {
  constructor() {
    this.docsId = process.env.GOOGLE_DOCS_ID;
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    this.auth = null;
    this.docs = null;
    
    // Cache for document content to avoid repeated API calls
    this.contentCache = null;
    this.cacheTimestamp = null;
    this.cacheExpiry = 1 * 60 * 1000; // 1 minute cache (same as auto refresh)
    
    // Lock mechanism to prevent concurrent requests
    this.isLoading = false;
    this.loadingPromise = null;
    
    if (!this.docsId) {
      console.warn('GOOGLE_DOCS_ID not provided, Google Docs service will be disabled');
    }
  }

  /**
   * Initialize Google Docs API
   */
  async initialize() {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found: ${this.credentialsPath}`);
      }

      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/documents.readonly']
      });

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      
      console.log('✅ Google Docs service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Docs service:', error.message);
      this.docs = null;
    }
  }

  /**
   * Get document content with caching and locking
   * @param {boolean} forceRefresh - Force refresh even if cache is valid
   * @returns {Promise<string>} Document content
   */
  async getDocumentContent(forceRefresh = false) {
    if (!this.docs || !this.docsId) {
      throw new Error('Google Docs service not initialized');
    }

    // Check if we have valid cached content and not forcing refresh
    if (!forceRefresh && this.contentCache && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp) < this.cacheExpiry) {
      console.log('📄 Using cached document content');
      return this.contentCache;
    }

    // If already loading, wait for the current request
    if (this.isLoading && this.loadingPromise) {
      console.log('⏳ Waiting for ongoing document load...');
      return await this.loadingPromise;
    }

    // Start loading with lock
    this.isLoading = true;
    this.loadingPromise = this._loadDocumentContent();
    
    try {
      const content = await this.loadingPromise;
      return content;
    } finally {
      this.isLoading = false;
      this.loadingPromise = null;
    }
  }

  /**
   * Internal method to load document content
   * @private
   */
  async _loadDocumentContent() {
    try {
      console.log('📄 Loading document content from Google Docs API...');
      
      const response = await this.docs.documents.get({
        documentId: this.docsId
      });

      const document = response.data;
      const content = this.extractTextFromDocument(document);

      // Cache the content
      this.contentCache = content;
      this.cacheTimestamp = Date.now();
      
      console.log(`✅ Document content loaded and cached (${content.length} characters)`);
      return content;
    } catch (error) {
      console.error('❌ Error loading document content:', error);
      throw error;
    }
  }

  /**
   * Extract text content from Google Docs document
   * @param {Object} document - Google Docs document object
   * @returns {string} Extracted text
   */
  extractTextFromDocument(document) {
    let text = '';
    
    if (document.body && document.body.content) {
      for (const element of document.body.content) {
        if (element.paragraph) {
          text += this.extractTextFromParagraph(element.paragraph) + '\n';
        }
      }
    }
    
    return text.trim();
  }

  /**
   * Extract text from paragraph element
   * @param {Object} paragraph - Paragraph element
   * @returns {string} Extracted text
   */
  extractTextFromParagraph(paragraph) {
    let text = '';
    
    if (paragraph.elements) {
      for (const element of paragraph.elements) {
        if (element.textRun) {
          text += element.textRun.content;
        }
      }
    }
    
    return text;
  }

  /**
   * Search for relevant content in document
   * @param {string} query - Search query
   * @returns {Promise<string>} Relevant content
   */
  async searchContent(query) {
    try {
      const fullContent = await this.getDocumentContent();
      
      console.log(`🔍 Searching for: "${query}" in Google Docs`);
      
      const lines = fullContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const lowerQuery = query.toLowerCase();

      // First pass: Try to find exact matches
      for (const line of lines) {
        if (line.toLowerCase().includes(lowerQuery)) {
          console.log(`📄 Found exact match in Google Docs for query "${query}"`);
          return line;
        }
      }

      // Second pass: Try to find partial matches with key terms
      const queryWords = lowerQuery.split(/\s+/);
      const relevantLines = [];

      for (const line of lines) {
        const lineLower = line.toLowerCase();
        let matchCount = 0;
        
        for (const word of queryWords) {
          if (lineLower.includes(word)) {
            matchCount++;
          }
        }

        if (matchCount > 0) {
          relevantLines.push({
            line: line,
            score: matchCount / queryWords.length
          });
        }
      }

      // Sort by relevance score
      relevantLines.sort((a, b) => b.score - a.score);

      if (relevantLines.length > 0) {
        console.log(`📄 Found ${relevantLines.length} relevant lines for query "${query}"`);
        return relevantLines[0].line; // Return the most relevant line
      }

      // Third pass: Check for specific course-related terms
      const courseTerms = ['หลักสูตร', 'course', 'อบรม', 'training', 'สอบ', 'exam', 'วุฒิบัตร', 'certificate'];
      const hasCourseTerm = courseTerms.some(term => lowerQuery.includes(term));
      
      if (hasCourseTerm) {
        // Look for lines that contain course information
        for (const line of lines) {
          const lineLower = line.toLowerCase();
          if (courseTerms.some(term => lineLower.includes(term))) {
            console.log(`📄 Found course-related content for query "${query}"`);
            return line;
          }
        }
      }

      // Fourth pass: Check for specific business-related terms
      const businessTerms = ['ธุรกิจ', 'business', 'ข้อมูล', 'information', 'ติดต่อ', 'contact', 'อีเมล', 'email', 'เบอร์', 'phone'];
      const hasBusinessTerm = businessTerms.some(term => lowerQuery.includes(term));
      
      if (hasBusinessTerm) {
        // Look for lines that contain business information
        for (const line of lines) {
          const lineLower = line.toLowerCase();
          if (businessTerms.some(term => lineLower.includes(term))) {
            console.log(`📄 Found business-related content for query "${query}"`);
            return line;
          }
        }
      }
      
      // Fifth pass: Check for general business information
      if (lowerQuery.includes('ธุรกิจ') || lowerQuery.includes('business')) {
        // Look for business description or general info
        for (const line of lines) {
          const lineLower = line.toLowerCase();
          if (lineLower.includes('ข้อมูลธุรกิจ') || lineLower.includes('รายละเอียด') || lineLower.includes('บริการ')) {
            console.log(`📄 Found business description for query "${query}"`);
            return line;
          }
        }
      }

      // Sixth pass: Check for business-related content more broadly
      if (lowerQuery.includes('ธุรกิจ') || lowerQuery.includes('business') || lowerQuery.includes('ข้อมูล')) {
        // Look for any content that might be business-related
        const businessLines = [];
        for (const line of lines) {
          const lineLower = line.toLowerCase();
          if (lineLower.includes('ข้อมูล') || lineLower.includes('รายละเอียด') || 
              lineLower.includes('บริการ') || lineLower.includes('หลักสูตร') || 
              lineLower.includes('อบรม') || lineLower.includes('สอบ') ||
              lineLower.includes('วุฒิบัตร') || lineLower.includes('ประกันภัย')) {
            businessLines.push(line);
          }
        }
        
        if (businessLines.length > 0) {
          console.log(`📄 Found ${businessLines.length} business-related lines for query "${query}"`);
          return businessLines.slice(0, 5).join('\n'); // Return first 5 business-related lines
        }
      }

      // Seventh pass: If no specific match, return first few paragraphs as general context
      console.log(`📄 No specific match found for query "${query}", returning general context.`);
      return lines.slice(0, 5).join('\n'); // Return first 5 non-empty lines
    } catch (error) {
      console.error('Error searching content:', error);
      return '';
    }
  }

  /**
   * Search for content using simple keyword matching (no AI required)
   * @param {string} userMessage - User message
   * @returns {Promise<string>} Relevant content
   */
  async searchContentSimple(userMessage) {
    try {
      const fullContent = await this.getDocumentContent();
      console.log(`🔍 Simple search for: "${userMessage}" in Google Docs`);
      
      const lines = fullContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const lowerMessage = userMessage.toLowerCase();
      
      // Extract keywords from user message
      const keywords = this.extractKeywords(lowerMessage);
      console.log(`🔍 Extracted keywords: [${keywords.join(', ')}]`);
      
      // Search for content using keywords
      const results = [];
      
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        let score = 0;
        
        // Check each keyword
        for (const keyword of keywords) {
          if (lineLower.includes(keyword)) {
            score += 1;
          }
        }
        
        if (score > 0) {
          results.push({
            line: line,
            score: score,
            keywordMatches: keywords.filter(k => lineLower.includes(k))
          });
        }
      }
      
      // Sort by score (highest first)
      results.sort((a, b) => b.score - a.score);
      
      if (results.length > 0) {
        const bestMatch = results[0];
        console.log(`📄 Found ${results.length} matches, best score: ${bestMatch.score}`);
        console.log(`📄 Best match keywords: [${bestMatch.keywordMatches.join(', ')}]`);
        
        // Return the best match and up to 2 additional lines for context
        const contextLines = [bestMatch.line];
        const bestIndex = lines.indexOf(bestMatch.line);
        
        // Add context lines
        for (let i = 1; i <= 2; i++) {
          if (bestIndex + i < lines.length) {
            contextLines.push(lines[bestIndex + i]);
          }
        }
        
        return contextLines.join('\n');
      }
      
      // If no specific match, return general business information
      console.log(`📄 No specific match found, returning general business information`);
      return this.getGeneralBusinessInfo(lines);
      
    } catch (error) {
      console.error('❌ Error in simple search:', error);
      return '';
    }
  }

  /**
   * Extract keywords from user message
   * @param {string} message - User message
   * @returns {Array} Extracted keywords
   */
  extractKeywords(message) {
    // Remove common words and extract meaningful keywords
    const stopWords = ['คือ', 'อะไร', 'ใคร', 'ที่', 'ใน', 'ของ', 'และ', 'หรือ', 'แต่', 'แล้ว', 'จะ', 'ได้', 'ให้', 'กับ', 'จาก', 'ไป', 'มา', 'อยู่', 'เป็น', 'มี', 'ไม่', 'ใช่', 'ใช่ไหม', 'ครับ', 'ค่ะ', 'หน่อย', 'บ้าง', 'ได้ไหม', '?', '!', '.', ',', ';', ':'];
    
    const words = message.split(/\s+/).filter(word => 
      word.length > 1 && !stopWords.includes(word)
    );
    
    // Add common business terms if message contains related words
    const businessTerms = [];
    if (message.includes('ธุรกิจ') || message.includes('business')) {
      businessTerms.push('ธุรกิจ', 'ข้อมูลธุรกิจ', 'รายละเอียด');
    }
    if (message.includes('ติดต่อ') || message.includes('contact')) {
      businessTerms.push('ติดต่อ', 'ข้อมูลติดต่อ', 'อีเมล', 'เบอร์');
    }
    if (message.includes('บริการ') || message.includes('service')) {
      businessTerms.push('บริการ', 'ผลิตภัณฑ์', 'ข้อมูล');
    }
    if (message.includes('หลักสูตร') || message.includes('course')) {
      businessTerms.push('หลักสูตร', 'อบรม', 'training', 'สอบ', 'exam');
    }
    if (message.includes('ประกันภัย') || message.includes('insurance')) {
      businessTerms.push('ประกันภัย', 'insurance', 'วุฒิบัตร', 'certificate');
    }
    
    return [...words, ...businessTerms];
  }

  /**
   * Get general business information from document
   * @param {Array} lines - Document lines
   * @returns {string} General business information
   */
  getGeneralBusinessInfo(lines) {
    const businessKeywords = [
      'ข้อมูลธุรกิจ', 'ข้อมูลบริษัท', 'ผลิตภัณฑ์', 'บริการ', 'ข้อมูลติดต่อ', 'ข้อมูลสำคัญ',
      'สถาบันประกันภัยไทย', 'Thailand Insurance Institute', 'TII', 'วิสัยทัศน์', 'พันธกิจ',
      'หลักสูตร', 'อบรม', 'สอบ', 'วุฒิบัตร', 'ประกันภัย', 'เกี่ยวกับ'
    ];
    const businessLines = [];
    
    for (const line of lines) {
      const lineLower = line.toLowerCase();
      if (businessKeywords.some(keyword => lineLower.includes(keyword))) {
        businessLines.push(line);
      }
    }
    
    if (businessLines.length > 0) {
      return businessLines.slice(0, 5).join('\n');
    }
    
    // Fallback to first few lines
    return lines.slice(0, 3).join('\n');
  }

  /**
   * Get bot personality and identity information with caching
   * @returns {Promise<Object>} Bot personality object
   */
  async getBotPersonality() {
    try {
      // Use cached content if available
      const content = await this.getDocumentContent();
      
      console.log('🔍 Extracting bot personality from Google Docs...');
      console.log(`📄 Document content length: ${content.length}`);
      
      // Split content into lines for better processing
      const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Initialize result object
      const result = {
        personality: '',
        identity: '',
        businessInfo: '',
        botName: '',
        defaultResponse: '',
        language: 'thai',
        tone: 'friendly',
        fullContent: content,
        services: [],
        courses: [],
        contactInfo: '',
        about: ''
      };
      
      // Process each line to find configuration
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerLine = line.toLowerCase();
        
        // Check for personality
        if (lowerLine.includes('บุคลิกภาพ') || lowerLine.includes('personality')) {
          result.personality = this.extractValue(line, i, lines);
          if (result.personality) {
            console.log('🎭 Personality:', result.personality.substring(0, 50) + '...');
          }
        }
        
        // Check for identity
        if (lowerLine.includes('ตัวตน') || lowerLine.includes('identity')) {
          result.identity = this.extractValue(line, i, lines);
          if (result.identity) {
            console.log('👤 Identity:', result.identity.substring(0, 50) + '...');
          }
        }
        
        // Check for bot name (more specific matching)
        if ((lowerLine.includes('ชื่อบอท') || lowerLine.includes('bot name')) && 
            !lowerLine.includes('บุคลิกภาพ') && !lowerLine.includes('personality')) {
          result.botName = this.extractValue(line, i, lines);
          if (result.botName) {
            console.log('🤖 Bot Name:', result.botName);
          }
        }
        
        // Check for default response
        if (lowerLine.includes('คำตอบเริ่มต้น') || lowerLine.includes('default response') || lowerLine.includes('คำตอบมาตรฐาน')) {
          result.defaultResponse = this.extractValue(line, i, lines);
          if (result.defaultResponse) {
            console.log('💬 Default Response:', result.defaultResponse.substring(0, 50) + '...');
          }
        }
        
        // Check for language (more specific matching)
        if ((lowerLine.includes('ภาษา') || lowerLine.includes('language')) && 
            !lowerLine.includes('บุคลิกภาพ') && !lowerLine.includes('personality')) {
          result.language = this.extractValue(line, i, lines);
          if (result.language) {
            console.log('🌐 Language:', result.language);
          }
        }
        
        // Check for tone
        if (lowerLine.includes('โทนเสียง') || lowerLine.includes('tone')) {
          result.tone = this.extractValue(line, i, lines);
          if (result.tone) {
            console.log('🎵 Tone:', result.tone.substring(0, 50) + '...');
          }
        }
      }
      
      // Extract detailed business information
      result.businessInfo = this.extractBusinessInfo(lines);
      result.services = this.extractServices(lines);
      result.courses = this.extractCourses(lines);
      result.contactInfo = this.extractContactInfo(lines);
      result.about = this.extractAbout(lines);
      
      console.log('✅ Bot personality extraction completed');
      console.log('📊 Extracted data summary:');
      console.log(`   - Bot Name: ${result.botName ? '✅' : '❌'}`);
      console.log(`   - Personality: ${result.personality ? '✅' : '❌'}`);
      console.log(`   - Identity: ${result.identity ? '✅' : '❌'}`);
      console.log(`   - Business Info: ${result.businessInfo ? '✅' : '❌'}`);
      console.log(`   - Services: ${result.services.length} items`);
      console.log(`   - Courses: ${result.courses.length} items`);
      console.log(`   - Contact Info: ${result.contactInfo ? '✅' : '❌'}`);
      console.log(`   - About: ${result.about ? '✅' : '❌'}`);
      console.log(`   - Default Response: ${result.defaultResponse ? '✅' : '❌'}`);
      console.log(`   - Language: ${result.language || 'Not specified'}`);
      console.log(`   - Tone: ${result.tone ? '✅' : '❌'}`);
      console.log('================================');
      
      return result;
    } catch (error) {
      console.error('❌ Error getting bot personality:', error);
      return {
        personality: '',
        identity: '',
        businessInfo: '',
        botName: '',
        defaultResponse: '',
        language: 'thai',
        tone: 'friendly',
        fullContent: '',
        services: [],
        courses: [],
        contactInfo: '',
        about: ''
      };
    }
  }
  
  /**
   * Extract business information from lines
   * @param {Array} lines - All lines
   * @returns {string} Business information
   */
  extractBusinessInfo(lines) {
    const businessKeywords = [
      'ข้อมูลธุรกิจ', 'ข้อมูลบริษัท', 'เกี่ยวกับ', 'สถาบันประกันภัยไทย',
      'วิสัยทัศน์', 'พันธกิจ', 'พันธกิจ', 'ข้อมูลสำคัญ'
    ];
    
    let businessInfo = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (businessKeywords.some(keyword => lowerLine.includes(keyword))) {
        const value = this.extractValue(line, i, lines);
        if (value && value.length > 10) {
          businessInfo.push(value);
        }
      }
    }
    
    return businessInfo.join(' ');
  }

  /**
   * Extract services information from lines
   * @param {Array} lines - All lines
   * @returns {Array} Services information
   */
  extractServices(lines) {
    const services = [];
    const serviceKeywords = [
      'หลักสูตรอบรม', 'การสอบวุฒิบัตร', 'บริการวิชาการ', 'การจัดสัมมนา',
      'การบรรยายพิเศษ', 'การให้บริการข้อมูล', 'คำปรึกษาด้านวิชาการ'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (serviceKeywords.some(keyword => lowerLine.includes(keyword))) {
        const value = this.extractValue(line, i, lines);
        if (value && value.length > 10) {
          services.push(value);
        }
      }
    }
    
    return services;
  }

  /**
   * Extract courses information from lines
   * @param {Array} lines - All lines
   * @returns {Array} Courses information
   */
  extractCourses(lines) {
    const courses = [];
    const courseKeywords = [
      'หลักสูตรพื้นฐาน', 'หลักสูตรเฉพาะด้าน', 'หลักสูตรพัฒนาผู้บริหาร',
      'การประกันวินาศภัย', 'การประกันชีวิต', 'การจัดการสินไหมทดแทน',
      'การพิจารณารับประกันภัย', 'วุฒิบัตรนักวิชาชีพประกันวินาศภัย',
      'วุฒิบัตรนักวิชาชีพประกันชีวิต'
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (courseKeywords.some(keyword => lowerLine.includes(keyword))) {
        const value = this.extractValue(line, i, lines);
        if (value && value.length > 10) {
          courses.push(value);
        }
      }
    }
    
    return courses;
  }

  /**
   * Extract contact information from lines
   * @param {Array} lines - All lines
   * @returns {string} Contact information
   */
  extractContactInfo(lines) {
    const contactKeywords = [
      'ติดต่อ', 'โทร', 'อีเมล', 'เว็บไซต์', 'ที่อยู่', 'เบอร์โทร',
      'email', 'website', 'phone', 'address'
    ];
    
    let contactInfo = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (contactKeywords.some(keyword => lowerLine.includes(keyword))) {
        const value = this.extractValue(line, i, lines);
        if (value && value.length > 5) {
          contactInfo.push(value);
        }
      }
    }
    
    return contactInfo.join(' ');
  }

  /**
   * Extract about information from lines
   * @param {Array} lines - All lines
   * @returns {string} About information
   */
  extractAbout(lines) {
    const aboutKeywords = [
      'เกี่ยวกับสถาบันประกันภัยไทย', 'เกี่ยวกับ', 'สถาบันประกันภัยไทย',
      'Thailand Insurance Institute', 'TII', 'ก่อตั้ง', 'ปี พ.ศ.'
    ];
    
    let aboutInfo = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (aboutKeywords.some(keyword => lowerLine.includes(keyword))) {
        const value = this.extractValue(line, i, lines);
        if (value && value.length > 20) {
          aboutInfo.push(value);
        }
      }
    }
    
    return aboutInfo.join(' ');
  }

  /**
   * Extract value from a line or following lines
   * @param {string} line - Current line
   * @param {number} index - Current line index
   * @param {Array} lines - All lines
   * @returns {string} Extracted value
   */
  extractValue(line, index, lines) {
    // Try to extract value from the same line first
    const colonMatch = line.match(/[:\s]+(.+)$/);
    if (colonMatch && colonMatch[1].trim()) {
      return colonMatch[1].trim();
    }
    
    // If no value on same line, look at next lines
    let value = '';
    for (let i = index + 1; i < lines.length && i < index + 5; i++) {
      const nextLine = lines[i].trim();
      if (nextLine && !nextLine.includes(':') && !nextLine.includes('=')) {
        value += (value ? ' ' : '') + nextLine;
      } else if (nextLine.includes(':') || nextLine.includes('=')) {
        break;
      }
    }
    
    return value.trim();
  }

  /**
   * Check if the service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      if (!this.docs || !this.docsId) {
        return false;
      }
      
      await this.docs.documents.get({
        documentId: this.docsId
      });
      
      return true;
    } catch (error) {
      console.error('Google Docs service unavailable:', error);
      return false;
    }
  }
}

module.exports = { GoogleDocsService };