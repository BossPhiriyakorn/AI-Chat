const { AutoRefreshService } = require('./autoRefreshService');
const { TerminalDisplayService } = require('./terminalDisplayService');

class ChatbotService {
  constructor(geminiService, googleDocsService, googleSheetsService, nlpService) {
    this.geminiService = geminiService;
    this.googleDocsService = googleDocsService;
    this.googleSheetsService = googleSheetsService;
    this.nlpService = nlpService;
    
    this.botPersonality = null;
    this.isInitialized = false;
    this.autoRefreshService = null;
    this.terminalDisplay = new TerminalDisplayService();
    this.keywordsData = []; // Store keywords data from Google Sheets
    
    // User Session Management for Multi-User Support
    this.userSessions = new Map(); // เก็บ session ของแต่ละ user
    this.messageQueue = []; // queue สำหรับจัดลำดับข้อความ
    this.isProcessing = false; // flag ป้องกันการประมวลผลซ้อน
    this.sessionTimeout = 30 * 60 * 1000; // 30 นาที
    this.maxQueueSize = 100; // จำกัดขนาด queue
    
    // Initialize services
    this.initialize();
  }

  /**
   * Initialize chatbot service
   */
  async initialize() {
    try {
      this.terminalDisplay.showMainTitle('Initializing Chatbot Service', '🤖');
      
      // Initialize Google services
      this.terminalDisplay.showMessage('Initializing Google services...', 'info');
      await this.googleDocsService.initialize();
      await this.googleSheetsService.initialize();
      
      // Load bot personality from Google Docs
      this.terminalDisplay.showMessage('Loading bot personality...', 'info');
      await this.loadBotPersonality();
      
      // Load keywords data from Google Sheets
      this.terminalDisplay.showMessage('Loading keywords data...', 'info');
      await this.loadKeywordsData();
      
      // Initialize auto refresh service
      this.terminalDisplay.showMessage('Starting auto refresh service...', 'info');
      this.autoRefreshService = new AutoRefreshService(this);
      this.autoRefreshService.start();
      
      this.isInitialized = true;
      
      // Start automatic session cleanup (every 10 minutes)
      this.terminalDisplay.showMessage('Starting session cleanup service...', 'info');
      setInterval(() => {
        this.cleanupExpiredSessions();
      }, 10 * 60 * 1000); // 10 minutes
      
      // แสดงข้อมูลการเริ่มต้นระบบ
      await this.showInitializationData();
      
    } catch (error) {
      this.terminalDisplay.showError('Chatbot Service Initialization', error);
      this.isInitialized = false;
    }
  }

  /**
   * แสดงข้อมูลการเริ่มต้นระบบ
   */
  async showInitializationData() {
    try {
      // ตรวจสอบสถานะการเชื่อมต่อ
      const connectionStatus = {
        gemini: await this.geminiService.isAvailable(),
        googleDocs: await this.googleDocsService.isAvailable(),
        googleSheets: await this.googleSheetsService.isAvailable(),
        lineBot: true // LINE Bot จะทำงานเมื่อมี webhook
      };

      // ข้อมูล Google Sheets
      const sheetsData = {
        keywords: this.googleSheetsService.getAllKeywords(),
        sheetNames: this.googleSheetsService.getAvailableSheets()
      };

      // ข้อมูล Auto Refresh
      const autoRefresh = {
        status: this.autoRefreshService ? this.autoRefreshService.getStatus() : null
      };

      // แสดงข้อมูลการเริ่มต้น
      this.terminalDisplay.showInitialization({
        connectionStatus,
        botConfig: this.botPersonality,
        sheetsData,
        docsData: this.botPersonality,
        autoRefresh
      });

    } catch (error) {
      this.terminalDisplay.showError('Initialization Data Display', error);
    }
  }

  /**
   * User Session Management Functions
   */
  
  /**
   * Get user session data
   * @param {string} userId - User ID
   * @returns {Object|null} User session data
   */
  getUserSession(userId) {
    const session = this.userSessions.get(userId);
    if (session && Date.now() - session.timestamp < this.sessionTimeout) {
      return session;
    }
    // Remove expired session
    if (session) {
      this.userSessions.delete(userId);
    }
    return null;
  }

  /**
   * Set user session data
   * @param {string} userId - User ID
   * @param {Object} data - Session data
   */
  setUserSession(userId, data) {
    this.userSessions.set(userId, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [userId, session] of this.userSessions.entries()) {
      if (now - session.timestamp > this.sessionTimeout) {
        this.userSessions.delete(userId);
        this.terminalDisplay.showMessage(`Cleaned up expired session for user: ${userId}`, 'info');
      }
    }
  }

  /**
   * Add message to queue for processing
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @returns {Promise<string>} Response
   */
  async addToQueue(userId, message) {
    return new Promise((resolve, reject) => {
      // Check queue size limit
      if (this.messageQueue.length >= this.maxQueueSize) {
        this.terminalDisplay.showMessage('Message queue is full, rejecting message', 'error');
        resolve('ขออภัยค่ะ ระบบยุ่งอยู่ กรุณาลองใหม่อีกครั้งในอีกสักครู่');
        return;
      }

      // Add to queue
      this.messageQueue.push({
        userId,
        message,
        timestamp: Date.now(),
        resolve,
        reject
      });

      // Process queue if not already processing
      if (!this.isProcessing) {
        this.processMessageQueue();
      }
    });
  }

  /**
   * Process message queue sequentially
   */
  async processMessageQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.terminalDisplay.showMessage('Starting message queue processing', 'info');

    while (this.messageQueue.length > 0) {
      const { userId, message, resolve, reject } = this.messageQueue.shift();
      
      try {
        this.terminalDisplay.showMessage(`Processing queued message from user: ${userId}`, 'info');
        const response = await this.processMessageDirect(userId, message);
        resolve(response);
      } catch (error) {
        this.terminalDisplay.showMessage(`Error processing queued message: ${error.message}`, 'error');
        reject(error);
      }
    }

    this.isProcessing = false;
    this.terminalDisplay.showMessage('Message queue processing completed', 'info');
  }

  /**
   * Load bot personality from Google Docs
   */
  async loadBotPersonality() {
    try {
      if (await this.googleDocsService.isAvailable()) {
        this.botPersonality = await this.googleDocsService.getBotPersonality();
        this.terminalDisplay.showMessage('Bot personality loaded from Google Docs', 'success');
      } else {
        this.terminalDisplay.showWarning('Google Docs not available, using default personality');
        this.botPersonality = this.getDefaultPersonality();
      }
    } catch (error) {
      this.terminalDisplay.showError('Bot Personality Loading', error);
      this.botPersonality = this.getDefaultPersonality();
    }
  }

  /**
   * Load keywords data from Google Sheets
   */
  async loadKeywordsData() {
    try {
      this.terminalDisplay.showMessage('Loading keywords data from Google Sheets...', 'info');
      
      // Get keywords data from Google Sheets service
      this.keywordsData = this.googleSheetsService.getAllKeywords() || [];
      
      if (this.keywordsData && this.keywordsData.length > 0) {
        this.terminalDisplay.showMessage(`Loaded ${this.keywordsData.length} keywords from Google Sheets`, 'success');
        
        // Show sample keywords
        const sampleKeywords = this.keywordsData.slice(0, 3).map(k => k.keyword).join(', ');
        this.terminalDisplay.showMessage(`Sample keywords: ${sampleKeywords}...`, 'info');
      } else {
        this.terminalDisplay.showWarning('No keywords data loaded from Google Sheets');
      }
    } catch (error) {
      this.terminalDisplay.showError('Keywords Data Loading', error);
      this.keywordsData = [];
    }
  }

  /**
   * Refresh all data from Google services
   */
  async refreshData() {
    try {
      this.terminalDisplay.showMainTitle('Refreshing Data from Google Services', '🔄');
      
      // Refresh Google Sheets data
      if (this.googleSheetsService) {
        this.terminalDisplay.showMessage('Refreshing Google Sheets data...', 'info');
        await this.googleSheetsService.refreshData();
        this.terminalDisplay.showMessage('Google Sheets data refreshed', 'success');
      }
      
      // Refresh Google Docs data (force refresh)
      if (this.googleDocsService) {
        this.terminalDisplay.showMessage('Refreshing Google Docs data...', 'info');
        // Clear cache to force refresh
        this.googleDocsService.contentCache = null;
        this.googleDocsService.cacheTimestamp = null;
        
        // Load fresh data
        this.botPersonality = await this.googleDocsService.getBotPersonality();
        this.terminalDisplay.showMessage('Google Docs data refreshed', 'success');
      }
      
      // Reload keywords data
      this.terminalDisplay.showMessage('Reloading keywords data...', 'info');
      await this.loadKeywordsData();
      
      this.terminalDisplay.showSuccess('Data refresh completed');
    } catch (error) {
      this.terminalDisplay.showError('Data Refresh', error);
    }
  }

  /**
   * Get auto refresh service status
   * @returns {Object} Auto refresh status
   */
  getAutoRefreshStatus() {
    if (!this.autoRefreshService) {
      return { isRunning: false, error: 'Auto refresh service not initialized' };
    }
    return this.autoRefreshService.getStatus();
  }

  /**
   * Force refresh data immediately
   */
  async forceRefresh() {
    if (this.autoRefreshService) {
      await this.autoRefreshService.forceRefresh();
    } else {
      await this.refreshData();
    }
  }

  /**
   * Generate fallback response with intelligent analysis
   * @param {string} userMessage - User's message
   * @returns {Promise<string>} Fallback response
   */
  async generateFallbackResponse(userMessage) {
    try {
      // Try to analyze the message using Gemini AI for better understanding
      if (this.geminiService && await this.geminiService.isAvailable()) {
        const analysis = await this.analyzeMessage(userMessage);
        
        // Generate intelligent response based on analysis
        const intelligentResponse = await this.generateIntelligentFallback(userMessage, analysis);
        if (intelligentResponse) {
          return intelligentResponse;
        }
      }
    } catch (error) {
      console.warn('Error generating intelligent fallback:', error);
    }
    
    // Fallback to simple AI analysis if AI is not available
    return await this.generateSimpleFallback(userMessage);
  }

  /**
   * Generate intelligent fallback response using AI analysis
   * @param {string} userMessage - User's message
   * @param {Object} analysis - Message analysis result
   * @returns {Promise<string>} Intelligent fallback response
   */
  async generateIntelligentFallback(userMessage, analysis) {
    try {
      // Get personality and context from Google Docs
      let personality = '';
      let context = '';
      
      if (this.botPersonality) {
        personality = this.botPersonality.personality || '';
        context = this.botPersonality.businessInfo || '';
      }
      
      // Build prompt using data from Google Docs
      let prompt = '';
      if (personality) {
        prompt += `${personality}\n\n`;
      }
      if (context) {
        prompt += `ข้อมูลบริบท: ${context}\n\n`;
      }
      
      prompt += `คำถามของลูกค้า: "${userMessage}"\n\nคำตอบ:`;

      const response = await this.geminiService.generateResponse(prompt, '', '');
      return response.trim();
    } catch (error) {
      console.error('Error generating intelligent fallback:', error);
      return null;
    }
  }

  /**
   * Generate simple fallback response using AI analysis
   * @param {string} userMessage - User's message
   * @returns {Promise<string>} Simple fallback response
   */
  async generateSimpleFallback(userMessage) {
    try {
      // Get personality and context from Google Docs
      let personality = '';
      let context = '';
      
      if (this.botPersonality) {
        personality = this.botPersonality.personality || '';
        context = this.botPersonality.businessInfo || '';
      }
      
      // Build prompt using data from Google Docs
      let prompt = '';
      if (personality) {
        prompt += `${personality}\n\n`;
      }
      if (context) {
        prompt += `ข้อมูลบริบท: ${context}\n\n`;
      }
      
      prompt += `คำถามของลูกค้า: "${userMessage}"\n\nคำตอบ:`;

      if (this.geminiService && await this.geminiService.isAvailable()) {
        const response = await this.geminiService.generateResponse(prompt, '', '');
        return response.trim();
      }
    } catch (error) {
      console.warn('Error generating simple fallback with AI:', error);
    }
    
    // Only use hardcoded response as last resort
    return 'ขออภัยค่ะ ฉันไม่สามารถตอบคำถามนี้ได้ในขณะนี้ คุณสามารถอธิบายเพิ่มเติมได้ไหมค่ะ เพื่อให้ฉันช่วยเหลือคุณได้ดีขึ้น?';
  }

  /**
   * Get default bot personality from environment variables
   * @returns {Object} Default personality object
   */
  getDefaultPersonality() {
    return {
      personality: process.env.BOT_PERSONALITY || 'helpful, friendly, professional',
      identity: process.env.BOT_NAME || 'AI Assistant',
      businessInfo: '',
      botName: process.env.BOT_NAME || 'AI Assistant',
      defaultResponse: process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือเพิ่มเติม',
      language: 'thai',
      tone: 'friendly',
      fullContent: ''
    };
  }

  /**
   * Process user message with queue system (Public API)
   * @param {string} userMessage - User's message
   * @param {string} userId - User ID
   * @returns {Promise<string>} Bot response
   */
  async processMessage(userMessage, userId) {
    try {
      // Clean up expired sessions periodically
      if (Math.random() < 0.1) { // 10% chance to cleanup
        this.cleanupExpiredSessions();
      }

      // Update user session
      this.setUserSession(userId, {
        lastMessage: userMessage,
        messageCount: (this.getUserSession(userId)?.messageCount || 0) + 1
      });

      // Add to queue for processing
      return await this.addToQueue(userId, userMessage);
    } catch (error) {
      this.terminalDisplay.showError('Process Message', error);
      return 'ขออภัยค่ะ เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * Process user message directly (Internal method)
   * @param {string} userId - User ID  
   * @param {string} userMessage - User's message
   * @returns {Promise<string>} Bot response
   */
  async processMessageDirect(userId, userMessage) {
    try {
      if (!this.isInitialized) {
        this.terminalDisplay.showWarning('Chatbot service not initialized, using fallback response');
        return process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ ระบบกำลังเริ่มต้น กรุณาลองใหม่อีกครั้ง';
      }

      this.terminalDisplay.showMessage(`Processing message from ${userId}`, 'info');

      // Step 1: Enhanced message analysis and comparison
      this.terminalDisplay.showMessage('Step 1: Analyzing message and comparing data sources...', 'info');
      const messageAnalysis = await this.enhancedMessageAnalysis(userMessage);
      
      // Determine primary data source based on AI analysis
      const primarySource = this.determinePrimaryDataSource(messageAnalysis);
      this.terminalDisplay.showMessage(`Primary source determined: ${primarySource} (confidence: ${messageAnalysis.confidence}%)`, 'info');
      
      let aiMatch = null;
      
      // Step 2: Search in primary data source first
      if (primarySource === 'docs') {
        this.terminalDisplay.showMessage('Step 2: AI-powered search in Google Docs (primary source)...', 'info');
        aiMatch = await this.findBestAnswerWithAI(userMessage, 'docs');
        
        if (aiMatch && aiMatch.confidence > 60) {
          this.terminalDisplay.showMessage(`AI found Docs match: "${aiMatch.keyword}" (${aiMatch.matchType}, confidence: ${aiMatch.confidence}%)`, 'success');
          
          // Format the response
          let response = this.formatDocsAnswer(aiMatch.answer);
          this.terminalDisplay.showMessageProcessing(userId, userMessage, response, 'Google Docs (AI)');
          return response;
        } else {
          this.terminalDisplay.showMessage('AI Docs search failed, trying Google Sheets...', 'warning');
        }
      }
      
      // Step 3: Search in Google Sheets
      this.terminalDisplay.showMessage('Step 3: AI-powered search in Google Sheets...', 'info');
      aiMatch = await this.findBestAnswerWithAI(userMessage, 'sheets');
      
      if (aiMatch && aiMatch.confidence > 70) {
        this.terminalDisplay.showMessage(`AI found Sheets match: "${aiMatch.keyword}" (${aiMatch.matchType}, confidence: ${aiMatch.confidence}%)`, 'success');
        
        // Return answer directly from Google Sheets (no formatting at all)
        let cleanAnswer = aiMatch.answer.trim();
        cleanAnswer = cleanAnswer.replace(/\s*\[keyword\]\s*$/i, '');
        cleanAnswer = cleanAnswer.replace(/\s*\[ai\]\s*$/i, '');
        
        // No formatting - return answer directly from Google Sheets
        const response = cleanAnswer;
        this.terminalDisplay.showMessageProcessing(userId, userMessage, response, 'Google Sheets (AI)');
        return response;
      } else {
        this.terminalDisplay.showMessage('AI Sheets search failed, trying Google Docs...', 'warning');
      }
      
      // Step 4: Search in Google Docs (if not already tried)
      if (primarySource !== 'docs') {
        this.terminalDisplay.showMessage('Step 4: AI-powered search in Google Docs...', 'info');
        aiMatch = await this.findBestAnswerWithAI(userMessage, 'docs');
        
        if (aiMatch && aiMatch.confidence > 60) {
          this.terminalDisplay.showMessage(`AI found Docs match: "${aiMatch.keyword}" (${aiMatch.matchType}, confidence: ${aiMatch.confidence}%)`, 'success');
          
          // Format the response
          let response = this.formatDocsAnswer(aiMatch.answer);
          this.terminalDisplay.showMessageProcessing(userId, userMessage, response, 'Google Docs (AI)');
          return response;
        }
      }
      
      // Step 4: Fallback to traditional Google Docs search
      this.terminalDisplay.showMessage('Step 4: Fallback to traditional Google Docs search...', 'info');
      this.terminalDisplay.showMessage('Using AI to analyze message and search Google Docs for context...', 'info');
      const analysis = await this.analyzeMessage(userMessage);

      // Check if we have any keywords to search for
      if (analysis.keywords && analysis.keywords.length > 0) {
        this.terminalDisplay.showMessage(`Keywords found: [${analysis.keywords.join(', ')}]`, 'info');
      } else {
        this.terminalDisplay.showMessage('No keywords found in analysis, using full message for search', 'warning');
      }

      // Try to generate AI response using Google Docs
      let aiResponse;
      try {
        this.terminalDisplay.showMessage('Searching Google Docs for relevant context...', 'info');
        aiResponse = await this.generateAIResponse(userMessage, analysis);
        this.terminalDisplay.showMessage('AI Response generated using Google Docs context', 'success');
      } catch (error) {
        this.terminalDisplay.showError('AI Response Generation', error);
        
        // If AI fails, try to use Google Docs data directly
        this.terminalDisplay.showMessage('AI unavailable, trying to use Google Docs data directly...', 'warning');
        aiResponse = await this.generateResponseFromGoogleDocs(userMessage, analysis);
        this.terminalDisplay.showMessage('Google Docs response generated', 'success');
      }
      
      const response = this.formatResponse(aiResponse, 'ai');
      this.terminalDisplay.showMessageProcessing(userId, userMessage, response, 'Gemini AI + Google Docs');
      return response;

    } catch (error) {
      console.error('Error processing message:', error);
      return process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
    }
  }

  /**
   * Analyze user message
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Analysis result
   */
  async analyzeMessage(userMessage) {
    try {
      // Use NLP service for basic analysis
      const questionType = this.nlpService.detectQuestionType(userMessage);
      const keywords = this.nlpService.extractKeywords(userMessage);
      
      // Use Gemini AI for advanced analysis if available
      let geminiAnalysis = null;
      if (await this.geminiService.isAvailable()) {
        try {
          // Get context from Google Docs for better analysis
          let context = '';
          if (this.botPersonality) {
            context = this.botPersonality.businessInfo || '';
          }
          
          geminiAnalysis = await this.geminiService.analyzeText(userMessage, context);
        } catch (error) {
          console.warn('Gemini analysis failed, using NLP only:', error);
        }
      } else {
        console.log('🔄 Gemini AI not available, using simple analysis...');
      }

      // Enhance analysis with additional context
      const enhancedAnalysis = this.enhanceAnalysis(userMessage, {
        questionType: questionType.type,
        confidence: questionType.confidence,
        keywords: keywords,
        geminiAnalysis: geminiAnalysis
      });

      return {
        ...enhancedAnalysis,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing message:', error);
      return {
        questionType: 'unknown',
        confidence: 0,
        keywords: [],
        geminiAnalysis: null,
        timestamp: new Date().toISOString()
      };
    }
  }


  /**
   * Enhance analysis with additional context
   * @param {string} userMessage - User's message
   * @param {Object} analysis - Basic analysis result
   * @returns {Object} Enhanced analysis result
   */
  enhanceAnalysis(userMessage, analysis) {
    const message = userMessage.toLowerCase().trim();
    
    // Detect specific intents
    const intents = [];
    
    // Contact-related intents (using generic patterns only)
    if (message.includes('email') || message.includes('@')) {
      intents.push('email_request');
    }
    if (message.includes('phone') || message.includes('tel')) {
      intents.push('phone_request');
    }
    if (message.includes('contact')) {
      intents.push('contact_request');
    }
    
    // Business-related intents (using generic patterns only)
    if (message.includes('business')) {
      intents.push('business_inquiry');
    }
    if (message.includes('service')) {
      intents.push('service_inquiry');
    }
    
    // Question types
    let questionType = analysis.questionType || 'general';
    if (intents.includes('email_request') || intents.includes('phone_request')) {
      questionType = 'contact_inquiry';
    } else if (intents.includes('business_inquiry')) {
      questionType = 'business_inquiry';
    }
    
    // Enhanced keywords
    const enhancedKeywords = [...(analysis.keywords || [])];
    
    // Add detected intents as keywords
    intents.forEach(intent => {
      if (!enhancedKeywords.includes(intent)) {
        enhancedKeywords.push(intent);
      }
    });
    
    return {
      ...analysis,
      keywords: enhancedKeywords,
      questionType: questionType,
      intents: intents,
      enhanced: true
    };
  }

  /**
   * Find keyword match in Google Sheets
   * @param {string} userMessage - User's message
   * @returns {Promise<Object|null>} Keyword match result
   */
  async findKeywordMatch(userMessage) {
    try {
      if (!await this.googleSheetsService.isAvailable()) {
        console.warn('Google Sheets not available for keyword matching');
        return null;
      }

      // Refresh data if needed
      if (this.googleSheetsService.needsRefresh()) {
        await this.googleSheetsService.refreshData();
      }

      // Find exact or partial match with improved analysis
      let match = this.googleSheetsService.findMatchingKeyword(userMessage, 0.3);
      
      if (!match) {
        // Try with even lower threshold for better matching
        match = this.googleSheetsService.findMatchingKeyword(userMessage, 0.1);
      }
      
      if (match) {
        console.log(`✅ Keyword match found: "${match.keyword}" (score: ${match.score}, type: ${match.matchType})`);
        return match;
      }

      // Try with specific contact terms (using generic patterns only)
      const emailTerms = ['email', 'e-mail', '@'];
      const hasEmailTerm = emailTerms.some(term => userMessage.toLowerCase().includes(term));
      
      if (hasEmailTerm) {
        const emailMatch = this.googleSheetsService.findMatchingKeyword(userMessage, 0.05);
        if (emailMatch) {
          console.log(`🔍 Email term match found: "${emailMatch.keyword}" (score: ${emailMatch.score})`);
          return emailMatch;
        }
      }
      
      const phoneTerms = ['phone', 'tel'];
      const hasPhoneTerm = phoneTerms.some(term => userMessage.toLowerCase().includes(term));
      
      if (hasPhoneTerm) {
        const phoneMatch = this.googleSheetsService.findMatchingKeyword(userMessage, 0.05);
        if (phoneMatch) {
          console.log(`🔍 Phone term match found: "${phoneMatch.keyword}" (score: ${phoneMatch.score})`);
          return phoneMatch;
        }
      }
      
      const contactTerms = ['contact'];
      const hasContactTerm = contactTerms.some(term => userMessage.toLowerCase().includes(term));
      
      if (hasContactTerm) {
        const contactMatch = this.googleSheetsService.findMatchingKeyword(userMessage, 0.05);
        if (contactMatch) {
          console.log(`🔍 Contact term match found: "${contactMatch.keyword}" (score: ${contactMatch.score})`);
          return contactMatch;
        }
      }

      console.log('❌ No keyword match found');
      return null;

    } catch (error) {
      console.error('Error finding keyword match:', error);
      return null;
    }
  }

  /**
   * Generate AI response using Gemini
   * @param {string} userMessage - User's message
   * @param {Object} analysis - Message analysis
   * @returns {Promise<string>} AI generated response
   */
  async generateAIResponse(userMessage, analysis) {
    try {
      if (!await this.geminiService.isAvailable()) {
        console.warn('Gemini AI not available, using fallback response');
        return process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';
      }

                // Get context from Google Docs
                let context = '';
                if (await this.googleDocsService.isAvailable()) {
                  try {
                    console.log('🔍 Step 1: Searching Google Docs based on AI analysis keywords...');
                    
                    // Search for relevant content based on keywords
                    if (analysis.keywords && analysis.keywords.length > 0) {
                      const searchQuery = analysis.keywords.slice(0, 3).join(' ');
                      console.log(`🔍 Searching for keywords: "${searchQuery}"`);
                      context = await this.googleDocsService.searchContent(searchQuery);
                      if (context) {
                        console.log(`✅ Found context from keywords: ${context.substring(0, 100)}...`);
                      } else {
                        console.log('❌ No context found from keywords');
                      }
                    }
                    
                    // If no specific context found, try searching with the full message
                    if (!context) {
                      console.log('🔍 Step 2: Searching with full message...');
                      context = await this.googleDocsService.searchContent(userMessage);
                      if (context) {
                        console.log(`✅ Found context from message: ${context.substring(0, 100)}...`);
                      } else {
                        console.log('❌ No context found from message');
                      }
                    }
                    
                    // If still no context found, use general business info
                    if (!context && this.botPersonality) {
                      console.log('🔍 Step 3: Using business info from personality...');
                      context = this.botPersonality.businessInfo || this.botPersonality.fullContent;
                      if (context) {
                        console.log(`✅ Using business info: ${context.substring(0, 100)}...`);
                      } else {
                        console.log('❌ No business info available');
                      }
                    }
                    
                    // If still no context, get the full document content
                    if (!context) {
                      console.log('🔍 Step 4: Using full document content...');
                      const fullContent = await this.googleDocsService.getDocumentContent(true); // Force refresh
                      context = fullContent.substring(0, 2000); // Limit to first 2000 chars
                      console.log(`✅ Using full document: ${context.substring(0, 100)}...`);
                    }
                    
                    console.log(`📊 Final context length: ${context ? context.length : 0} characters`);
                  } catch (error) {
                    console.warn('❌ Error getting context from Google Docs:', error);
                  }
                } else {
                  console.log('❌ Google Docs service not available');
                }

      // Build personality string from Google Docs only
      let personality = '';
      if (this.botPersonality) {
        personality = this.botPersonality.personality || '';
      }
      
      // Add additional context from extracted data
      let additionalContext = '';
      if (this.botPersonality) {
        if (this.botPersonality.about) {
          additionalContext += `\n\n${this.botPersonality.about}`;
        }
        if (this.botPersonality.services && this.botPersonality.services.length > 0) {
          additionalContext += `\n\n${this.botPersonality.services.join(', ')}`;
        }
        if (this.botPersonality.courses && this.botPersonality.courses.length > 0) {
          additionalContext += `\n\n${this.botPersonality.courses.join(', ')}`;
        }
        if (this.botPersonality.contactInfo) {
          additionalContext += `\n\n${this.botPersonality.contactInfo}`;
        }
      }
      
      context += additionalContext;

      // Generate response using Gemini with data from Google Docs
      const response = await this.geminiService.generateResponse(
        userMessage,
        context,
        personality
      );

      console.log('🤖 Generated AI response');
      return response;

    } catch (error) {
      console.error('Error generating AI response:', error);
      return process.env.DEFAULT_RESPONSE || 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';
    }
  }

  /**
   * Generate response directly from Google Docs data (without AI)
   * @param {string} userMessage - User message
   * @param {Object} analysis - Message analysis
   * @returns {Promise<string>} Response from Google Docs
   */
  async generateResponseFromGoogleDocs(userMessage, analysis) {
    try {
      console.log('🔍 Generating response from Google Docs data...');
      
      // Get context from Google Docs using simple search (no AI required)
      let context = '';
      if (await this.googleDocsService.isAvailable()) {
        try {
          // Use simple search that doesn't require AI
          console.log('🔍 Using simple search (no AI required)...');
          context = await this.googleDocsService.searchContentSimple(userMessage);
          
          if (context) {
            console.log(`✅ Found context from simple search: ${context.substring(0, 100)}...`);
          } else {
            console.log('⚠️ No context found from simple search');
          }
        } catch (error) {
          console.warn('❌ Error getting context from Google Docs:', error);
        }
      }
      
      // Add additional context from extracted data
      if (this.botPersonality) {
        if (this.botPersonality.about) {
          context += `\n\n${this.botPersonality.about}`;
        }
        if (this.botPersonality.services && this.botPersonality.services.length > 0) {
          context += `\n\n${this.botPersonality.services.join(', ')}`;
        }
        if (this.botPersonality.courses && this.botPersonality.courses.length > 0) {
          context += `\n\n${this.botPersonality.courses.join(', ')}`;
        }
        if (this.botPersonality.contactInfo) {
          context += `\n\n${this.botPersonality.contactInfo}`;
        }
      }
      
      // Format the response to be more conversational
      if (context) {
        let response = this.formatDocsResponse(context, userMessage);
        response = this.formatDocsAnswer(response);
        console.log(`✅ Generated response from Google Docs: ${response.substring(0, 100)}...`);
        return response;
      }
      
      // Fallback to default response
      const defaultResponse = this.botPersonality?.defaultResponse || 
                            process.env.DEFAULT_RESPONSE || 
                            'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';
      
      console.log(`⚠️ Using default response: ${defaultResponse.substring(0, 100)}...`);
      return defaultResponse;
      
    } catch (error) {
      console.error('❌ Error generating response from Google Docs:', error);
      return this.botPersonality?.defaultResponse || 
             process.env.DEFAULT_RESPONSE || 
             'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';
    }
  }

  /**
   * Format Google Docs content as a conversational response
   * @param {string} content - Content from Google Docs
   * @param {string} userMessage - Original user message
   * @returns {string} Formatted response
   */
  formatDocsResponse(content, userMessage) {
    try {
      // Clean up the content
      let response = content.trim();
      
      // Remove any technical markers or headers
      response = response.replace(/^\*\*.*?\*\*:\s*/, ''); // Remove **Header**: 
      response = response.replace(/^.*?:\s*/, ''); // Remove Header: 
      
      // If the content is too long, truncate it
      if (response.length > 800) {
        response = response.substring(0, 800) + '...';
      }
      
      // Add a friendly introduction if needed
      if (!response.startsWith('ขออภัย')) {
        response = `ข้อมูลที่เกี่ยวข้องกับคำถามของคุณ:\n\n${response}`;
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error formatting docs response:', error);
      return content.substring(0, 500); // Return truncated content as fallback
    }
  }

  /**
   * Format response for LINE
   * @param {string} response - Response text
   * @param {string} source - Response source (keyword, ai, fallback)
   * @returns {string} Formatted response
   */
  formatResponse(response, source) {
    if (!response || typeof response !== 'string') {
      // Use default response from Google Docs or fallback to env
      const defaultResponse = this.botPersonality?.defaultResponse || 
                            process.env.DEFAULT_RESPONSE || 
                            'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้';
      return defaultResponse;
    }

    // Clean up response
    let formattedResponse = response.trim();
    
    // Remove excessive whitespace
    formattedResponse = formattedResponse.replace(/\s+/g, ' ');
    
    // Format text for better readability
    formattedResponse = this.formatTextForReadability(formattedResponse);
    
    // Ensure response ends properly based on language setting
    const language = this.botPersonality?.language || 'thai';
    if (language === 'thai') {
      if (!formattedResponse.endsWith('.') && !formattedResponse.endsWith('!') && !formattedResponse.endsWith('?')) {
        formattedResponse += 'ค่ะ';
      }
    }

    // Clean response - remove any source tags that might be in the response
    formattedResponse = formattedResponse.replace(/\s*\[ai\]\s*$/i, '');
    formattedResponse = formattedResponse.replace(/\s*\[keyword\]\s*$/i, '');
    formattedResponse = formattedResponse.replace(/\s*\[fallback\]\s*$/i, '');
    formattedResponse = formattedResponse.replace(/\s*\[debug:.*?\]\s*$/i, '');
    
    // Add source information for debugging (only in server logs, not in response)
    if (process.env.NODE_ENV === 'development') {
      this.terminalDisplay.showMessage(`Response source: ${source}`, 'info');
    }

    return formattedResponse;
  }

  /**
   * Format clickable links in text
   * @param {string} text - Text to format
   * @returns {string} Text with clickable links
   */
  formatClickableLinks(text) {
    if (!text || typeof text !== 'string') return text;

    let formatted = text;

    // Format phone numbers with clickable links
    if (!formatted.includes('](tel:')) {
      formatted = formatted.replace(/(\d{2,3}-\d{3,4}-\d{4})/g, (match) => {
        return `[${match}](tel:${match})`;
      });
    }
    
    // Format email addresses with clickable links
    if (!formatted.includes('](mailto:')) {
      formatted = formatted.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
        return `[${match}](mailto:${match})`;
      });
    }
    
    // Format website URLs with clickable links
    if (!formatted.includes('](https://')) {
      formatted = formatted.replace(/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match) => {
        return `[${match}](https://${match})`;
      });
    }

    // Format Facebook links specifically
    if (!formatted.includes('](https://www.facebook.com')) {
      formatted = formatted.replace(/(www\.facebook\.com\/[a-zA-Z0-9._-]+)/g, (match) => {
        return `[${match}](https://${match})`;
      });
    }

    return formatted;
  }

  /**
   * Format text for better readability
   * @param {string} text - Text to format
   * @returns {string} Formatted text
   */
  formatTextForReadability(text) {
    if (!text || typeof text !== 'string') return text;

    let formatted = text;

    // 1. Basic text cleanup first
    formatted = formatted.replace(/\s+/g, ' '); // Remove excessive whitespace
    formatted = formatted.trim();

    // 2. Format clickable links
    formatted = this.formatClickableLinks(formatted);

    // 3. Add line breaks before bullet points and numbered lists
    formatted = formatted.replace(/([.!?])\s*([•\-\*])\s*/g, '$1\n\n$2 ');
    formatted = formatted.replace(/([.!?])\s*(\d+\.)\s*/g, '$1\n\n$2 ');

    // 4. Remove asterisks that might be formatting artifacts
    formatted = formatted.replace(/\*+/g, '');

    // 5. Clean up excessive line breaks and spaces
    formatted = formatted.replace(/\n{4,}/g, '\n\n\n'); // Max 3 line breaks
    formatted = formatted.replace(/[ \t]+/g, ' '); // Single spaces only
    formatted = formatted.replace(/\n[ \t]+/g, '\n'); // No leading spaces on new lines
    
    // 6. Ensure proper spacing around punctuation
    formatted = formatted.replace(/([.!?])([A-Za-z\u0E00-\u0E7F])/g, '$1 $2');
    formatted = formatted.replace(/([.!?])\s{2,}/g, '$1 '); // Single space after punctuation
    
    // 7. Add proper line spacing for readability
    formatted = formatted.replace(/([.!?])\s*(\n\n)/g, '$1$2'); // Keep double line breaks after sentences
    
    // 8. Final cleanup
    formatted = formatted.trim();
    
    // 9. Ensure sentences don't start immediately after punctuation without proper spacing
    formatted = formatted.replace(/([.!?])([A-Za-z\u0E00-\u0E7F])/g, '$1 $2');

    return formatted;
  }


  /**
   * AI-powered message analysis using Google Docs and Sheets
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} Enhanced analysis result
   */
  async enhancedMessageAnalysis(userMessage) {
    try {
      this.terminalDisplay.showMessage('🤖 Starting AI-powered message analysis...', 'info');
      
      // 1. Use AI to analyze the message and determine question type
      const aiAnalysis = await this.analyzeMessageWithAI(userMessage);
      
      // 2. Extract keywords using NLP service
      const extractedKeywords = this.nlpService.extractKeywords(userMessage);
      
      // 3. Determine best data source using AI analysis
      const sourcePreference = await this.determineBestDataSource(userMessage, aiAnalysis);
      
      // 4. Calculate confidence based on AI analysis
      const confidence = this.calculateAIConfidence(aiAnalysis, extractedKeywords);

      this.terminalDisplay.showMessage(`AI Analysis: Type[${aiAnalysis.questionType}], Intent[${aiAnalysis.intent}], Keywords[${extractedKeywords.join(', ')}], Source: ${sourcePreference}, Confidence: ${confidence}%`, 'info');

      return {
        questionTypes: [aiAnalysis.questionType],
        keywords: extractedKeywords,
        preferredSource: sourcePreference,
        confidence: confidence,
        originalMessage: userMessage,
        isSpecific: aiAnalysis.isSpecific,
        isGeneral: aiAnalysis.isGeneral,
        aiAnalysis: aiAnalysis
      };

    } catch (error) {
      console.error('Error in AI message analysis:', error);
      return {
        questionTypes: ['general'],
        keywords: [],
        preferredSource: 'docs',
        confidence: 50,
        originalMessage: userMessage,
        isSpecific: false,
        isGeneral: true,
        aiAnalysis: { questionType: 'general', intent: 'unknown', isSpecific: false, isGeneral: true }
      };
    }
  }

  /**
   * Use AI to analyze message and determine question type/intent
   * @param {string} userMessage - User's message
   * @returns {Promise<Object>} AI analysis result
   */
  async analyzeMessageWithAI(userMessage) {
    try {
      // Get context from Google Docs and Sheets for AI analysis
      const context = await this.getAnalysisContext();
      
      const prompt = `
Analyze this user message and determine the question type and intent. Use the context provided to understand the business domain.

User Message: "${userMessage}"

Context:
${context}

Please analyze and respond with a JSON object containing:
{
  "questionType": "greeting|contact|course|exam|service|about|time|location|price|general",
  "intent": "specific intent of the user",
  "isSpecific": true/false,
  "isGeneral": true/false,
  "confidence": 0-100,
  "suggestedKeywords": ["keyword1", "keyword2"],
  "typoCorrection": "corrected message if typos detected"
}

Focus on understanding the user's intent even if there are typos or misspellings.
`;

      const response = await this.geminiService.generateResponse(prompt, '', '');
      
      try {
        const analysis = JSON.parse(response);
        this.terminalDisplay.showMessage(`AI Analysis Result: ${JSON.stringify(analysis)}`, 'success');
        return analysis;
      } catch (parseError) {
        // Fallback if AI response is not valid JSON
        return this.fallbackAnalysis(userMessage);
      }
      
    } catch (error) {
      console.error('Error in AI message analysis:', error);
      return this.fallbackAnalysis(userMessage);
    }
  }

  /**
   * Get context for AI analysis from Google Docs and Sheets
   * @returns {Promise<string>} Context string
   */
  async getAnalysisContext() {
    let context = '';
    
    try {
      // Get business context from Google Docs
      if (this.botPersonality && this.botPersonality.businessInfo) {
        context += `Business Info: ${this.botPersonality.businessInfo}\n`;
      }
      
      if (this.botPersonality && this.botPersonality.services) {
        context += `Services: ${this.botPersonality.services}\n`;
      }
      
      // Get available keywords from Google Sheets
      const keywordsData = this.googleSheetsService.getAllKeywords();
      if (keywordsData && keywordsData.length > 0) {
        const sampleKeywords = keywordsData.slice(0, 10).map(k => k.keyword).join(', ');
        context += `Available Keywords: ${sampleKeywords}\n`;
      }
      
      // Get additional context from Google Docs content
      try {
        const docsContent = await this.googleDocsService.getDocumentContent();
        if (docsContent && docsContent.trim().length > 0) {
          // Extract key sections from Google Docs for context
          const lines = docsContent.split('\n').filter(line => line.trim().length > 0);
          const keySections = lines.slice(0, 20).join('\n'); // Get first 20 lines as context
          context += `\nGoogle Docs Context:\n${keySections}\n`;
        }
      } catch (docsError) {
        console.warn('Could not get Google Docs content for context:', docsError.message);
      }
      
    } catch (error) {
      console.error('Error getting analysis context:', error);
    }
    
    return context || 'General business context';
  }

  /**
   * Fallback analysis when AI fails
   * @param {string} userMessage - User's message
   * @returns {Object} Fallback analysis
   */
  fallbackAnalysis(userMessage) {
    // Simple fallback logic without hardcoded keywords
    return {
      questionType: 'general',
      intent: 'general_inquiry',
      isSpecific: false,
      isGeneral: true,
      confidence: 50,
      suggestedKeywords: [],
      typoCorrection: userMessage
    };
  }

  /**
   * Determine primary data source based on message analysis
   * @param {Object} messageAnalysis - Message analysis result
   * @returns {string} Primary data source ('docs' or 'sheets')
   */
  determinePrimaryDataSource(messageAnalysis) {
    try {
      // Use the source preference from message analysis
      if (messageAnalysis.preferredSource) {
        return messageAnalysis.preferredSource;
      }
      
      // Fallback logic based on question type and intent
      const aiAnalysis = messageAnalysis.aiAnalysis || {};
      const questionType = aiAnalysis.questionType || '';
      const intent = aiAnalysis.intent || '';
      
      // Use AI analysis to determine data source without hardcoded keywords
      // Default to sheets for simple questions, docs for complex ones
      if (questionType === 'general' && intent === 'general_inquiry') {
        return 'sheets';
      }
      
      // For specific questions, prefer docs for detailed information
      if (questionType !== 'general') {
        return 'docs';
      }
      
      // Default to sheets for simple questions
      return 'sheets';
      
    } catch (error) {
      console.error('Error determining primary data source:', error);
      return 'sheets'; // Default fallback
    }
  }

  /**
   * Determine best data source using AI analysis
   * @param {string} userMessage - User's message
   * @param {Object} aiAnalysis - AI analysis result
   * @returns {Promise<string>} Best data source
   */
  async determineBestDataSource(userMessage, aiAnalysis) {
    try {
      // Use AI to determine the best source
      const context = await this.getAnalysisContext();
      
      const prompt = `
Based on the user message and analysis, determine whether to use Google Sheets or Google Docs for the response.

User Message: "${userMessage}"
Question Type: ${aiAnalysis.questionType}
Intent: ${aiAnalysis.intent}

Context:
${context}

Google Sheets is better for: simple answers, contact info, basic questions
Google Docs is better for: detailed information, complex topics, comprehensive answers

Respond with only: "sheets" or "docs"
`;

      const response = await this.geminiService.generateResponse(prompt, '', '');
      const source = response.trim().toLowerCase();
      
      if (source === 'sheets' || source === 'docs') {
        return source;
      }
      
      // Fallback logic
      return aiAnalysis.isSpecific ? 'sheets' : 'docs';
      
    } catch (error) {
      console.error('Error determining data source:', error);
      return aiAnalysis.isSpecific ? 'sheets' : 'docs';
    }
  }

  /**
   * Calculate confidence based on AI analysis
   * @param {Object} aiAnalysis - AI analysis result
   * @param {Array} extractedKeywords - Extracted keywords
   * @returns {number} Confidence score
   */
  calculateAIConfidence(aiAnalysis, extractedKeywords) {
    let confidence = aiAnalysis.confidence || 50;
    
    // Boost confidence if we have good keywords
    if (extractedKeywords.length > 2) {
      confidence += 10;
    }
    
    // Boost confidence if AI detected specific intent
    if (aiAnalysis.isSpecific) {
      confidence += 15;
    }
    
    // Boost confidence if typo correction was successful
    if (aiAnalysis.typoCorrection && aiAnalysis.typoCorrection !== aiAnalysis.originalMessage) {
      confidence += 5;
    }
    
    return Math.min(confidence, 100);
  }

  /**
   * Determine preferred data source based on message analysis (legacy)
   * @param {string} lowerMessage - Lowercase message
   * @param {Array} detectedTypes - Detected question types
   * @returns {string} Preferred source ('sheets' or 'docs')
   */
  determineSourcePreference(lowerMessage, detectedTypes) {
    // Simple answers are better from Sheets
    const sheetsPreferred = ['greeting', 'contact', 'time', 'location', 'price'];
    
    // Complex information is better from Docs
    const docsPreferred = ['course', 'exam', 'service', 'about'];

    const sheetsScore = detectedTypes.filter(type => sheetsPreferred.includes(type)).length;
    const docsScore = detectedTypes.filter(type => docsPreferred.includes(type)).length;

    if (sheetsScore > docsScore) return 'sheets';
    if (docsScore > sheetsScore) return 'docs';
    
    // Default based on message complexity
    const wordCount = lowerMessage.split(' ').length;
    return wordCount <= 5 ? 'sheets' : 'docs';
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
   * Use AI to find the best answer from Google Sheets with typo handling
   * @param {string} userMessage - User's message
   * @param {string} source - Data source ('sheets' or 'docs')
   * @returns {Promise<Object|null>} Best answer match
   */
  async findBestAnswerWithAI(userMessage, source = 'sheets') {
    try {
      if (source === 'sheets') {
        // Refresh keywords data if needed
        if (this.googleSheetsService.needsRefresh()) {
          await this.googleSheetsService.refreshData();
        }
        
        const keywordsData = this.googleSheetsService.getAllKeywords();
        if (!keywordsData || keywordsData.length === 0) {
          this.terminalDisplay.showMessage('No keywords data available for AI analysis', 'warning');
          return null;
        }
      }

      // Get context for AI analysis
      const context = await this.getAnalysisContext();
      
      // Prepare data for AI analysis
      let dataToAnalyze = '';
      if (source === 'sheets') {
        const keywordsData = this.googleSheetsService.getAllKeywords();
        dataToAnalyze = keywordsData.map(k => `Keyword: "${k.keyword}" | Answer: "${k.answer}"`).join('\n');
        this.terminalDisplay.showMessage(`Analyzing ${keywordsData.length} keywords with AI...`, 'info');
      } else {
        // For docs source, get actual Google Docs content
        try {
          const docsContent = await this.googleDocsService.getDocumentContent();
          if (docsContent && docsContent.trim().length > 0) {
            dataToAnalyze = docsContent;
            this.terminalDisplay.showMessage(`Analyzing Google Docs content with AI (${docsContent.length} characters)...`, 'info');
          } else {
            this.terminalDisplay.showMessage('No Google Docs content available, using context...', 'warning');
            dataToAnalyze = context;
          }
        } catch (error) {
          console.error('Error getting Google Docs content:', error);
          this.terminalDisplay.showMessage('Failed to get Google Docs content, using context...', 'warning');
          dataToAnalyze = context;
        }
      }

      const prompt = `
Find the best answer for this user message. The user might have typos or misspellings, so be flexible in matching.

User Message: "${userMessage}"

Available Data:
${dataToAnalyze}

Context:
${context}

Analyze the user's intent and find the most relevant answer from the available data. Consider:
1. Direct keyword matches
2. Similar meanings (even with typos)
3. Intent-based matching
4. Context relevance
5. For Google Docs content, look for relevant sections that answer the user's question

${source === 'docs' ? 
  'Since this is Google Docs content, extract the most relevant information that directly answers the user\'s question. Look for specific details, explanations, or instructions that match the user\'s intent.' : 
  'Since this is Google Sheets data, match the user\'s message with the most appropriate keyword and answer pair.'
}

Respond with a JSON object:
{
  "keyword": "matched keyword or topic",
  "answer": "best answer extracted from the data",
  "confidence": 0-100,
  "matchType": "exact|similar|intent",
  "typoCorrected": "corrected message if typos found"
}

If no good match found, return null.
`;

      const response = await this.geminiService.generateResponse(prompt, '', '');
      
      try {
        // Clean the response to extract JSON from markdown code blocks
        const cleanedResponse = this.cleanJsonResponse(response);
        const result = JSON.parse(cleanedResponse);
        
        if (result && result.keyword && result.answer) {
          this.terminalDisplay.showMessage(`AI found ${source} match: "${result.keyword}" (${result.matchType}, confidence: ${result.confidence}%)`, 'success');
          return result;
        } else {
          this.terminalDisplay.showMessage(`AI found no suitable match in ${source}`, 'warning');
          return null;
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', response);
        this.terminalDisplay.showMessage('AI response parsing failed, using fallback', 'warning');
      }
      
      // Fallback to traditional keyword matching
      this.terminalDisplay.showMessage('Using traditional keyword matching as fallback...', 'info');
      return await this.findKeywordMatch(userMessage);
      
    } catch (error) {
      console.error('Error in AI-powered answer finding:', error);
      this.terminalDisplay.showError('AI Answer Finding', error);
      return await this.findKeywordMatch(userMessage);
    }
  }

  /**
   * Calculate confidence score for analysis
   * @param {Array} detectedTypes - Detected question types
   * @param {Array} extractedKeywords - Extracted keywords
   * @returns {number} Confidence percentage
   */
  calculateAnalysisConfidence(detectedTypes, extractedKeywords) {
    let confidence = 50; // Base confidence

    // More detected types = higher confidence
    confidence += detectedTypes.length * 10;

    // More keywords = higher confidence
    confidence += extractedKeywords.length * 5;

    // Cap at 95%
    return Math.min(confidence, 95);
  }

  /**
   * Validate keyword match against message analysis
   * @param {Object} keywordMatch - Keyword match from Sheets
   * @param {Object} messageAnalysis - Enhanced message analysis
   * @returns {Object} Validation result
   */
  validateKeywordMatch(keywordMatch, messageAnalysis) {
    try {
      const reasons = [];
      let isValid = true;

      // 1. Check if keyword match aligns with question types
      const keywordLower = keywordMatch.keyword.toLowerCase();
      const answerLower = keywordMatch.answer.toLowerCase();

      // 2. Validate contact questions
      if (messageAnalysis.questionTypes.includes('contact')) {
        if (!answerLower.includes('02-') && !answerLower.includes('@') && !answerLower.includes('www.')) {
          isValid = false;
          reasons.push('Contact question but answer lacks contact info');
        } else {
          reasons.push('Contact question with appropriate contact info');
        }
      }

      // 3. Validate course questions
      if (messageAnalysis.questionTypes.includes('course')) {
        if (!answerLower.includes('course') && !answerLower.includes('อบรม')) {
          isValid = false;
          reasons.push('Course question but answer lacks course info');
        } else {
          reasons.push('Course question with appropriate course info');
        }
      }

      // 4. Validate time questions
      if (messageAnalysis.questionTypes.includes('time')) {
        if (!answerLower.includes(':') && !answerLower.includes('เวลา') && !answerLower.includes('เปิด')) {
          isValid = false;
          reasons.push('Time question but answer lacks time info');
        } else {
          reasons.push('Time question with appropriate time info');
        }
      }

      // 5. Check keyword relevance
      const keywordRelevance = this.calculateKeywordRelevance(keywordMatch.keyword, messageAnalysis.keywords);
      if (keywordRelevance < 0.3) {
        isValid = false;
        reasons.push(`Low keyword relevance: ${(keywordRelevance * 100).toFixed(0)}%`);
      } else {
        reasons.push(`Good keyword relevance: ${(keywordRelevance * 100).toFixed(0)}%`);
      }

      // 6. Check source preference alignment
      if (messageAnalysis.preferredSource === 'docs' && messageAnalysis.isSpecific) {
        isValid = false;
        reasons.push('Complex question better suited for Docs');
      } else if (messageAnalysis.preferredSource === 'sheets') {
        reasons.push('Simple question suitable for Sheets');
      }

      return {
        isValid: isValid,
        confidence: keywordMatch.score,
        reason: reasons.join('; '),
        details: {
          keywordRelevance: keywordRelevance,
          sourceAlignment: messageAnalysis.preferredSource,
          questionTypes: messageAnalysis.questionTypes
        }
      };

    } catch (error) {
      console.error('Error validating keyword match:', error);
      return {
        isValid: true, // Default to valid on error
        confidence: keywordMatch.score,
        reason: 'Validation error, proceeding with match',
        details: {}
      };
    }
  }

  /**
   * Calculate keyword relevance
   * @param {string} matchedKeyword - Matched keyword from Sheets
   * @param {Array} messageKeywords - Keywords from message analysis
   * @returns {number} Relevance score (0-1)
   */
  calculateKeywordRelevance(matchedKeyword, messageKeywords) {
    if (!messageKeywords || messageKeywords.length === 0) return 0.5;

    const matchedLower = matchedKeyword.toLowerCase();
    let maxSimilarity = 0;

    for (const keyword of messageKeywords) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match
      if (matchedLower.includes(keywordLower) || keywordLower.includes(matchedLower)) {
        return 1.0;
      }
      
      // Partial similarity
      const similarity = this.calculateStringSimilarity(matchedLower, keywordLower);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }

    return maxSimilarity;
  }

  /**
   * Calculate string similarity
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateStringSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);
    
    if (maxLen === 0) return 1.0;
    
    let matches = 0;
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }

  /**
   * Format answers from Google Sheets for better readability
   * @param {string} answer - Answer from Google Sheets
   * @returns {string} Formatted answer
   */
  formatSheetsAnswer(answer) {
    if (!answer || typeof answer !== 'string') return answer;

    // Return answer directly from Google Sheets without any formatting
    // Only make links clickable and remove asterisks
    let formatted = answer.trim();

    // 1. Format clickable links only
    formatted = this.formatClickableLinks(formatted);

    // 2. Remove any asterisks that might be formatting artifacts
    formatted = formatted.replace(/\*+/g, '');

    // 3. Return as-is from Google Sheets (no other formatting)
    return formatted;
  }

  /**
   * Format answers from Google Docs with simple template
   * @param {string} answer - Answer from Google Docs
   * @returns {string} Formatted answer
   */
  formatDocsAnswer(answer) {
    if (!answer || typeof answer !== 'string') return answer;

    let formatted = answer.trim();

    // 1. Format clickable links
    formatted = this.formatClickableLinks(formatted);

    // 2. Apply simple template formatting
    formatted = this.applySimpleTemplate(formatted);

    // 3. Clean up formatting and remove asterisks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/\*+/g, '');
    formatted = formatted.trim();

    return formatted;
  }

  /**
   * Apply clean template formatting to Google Docs content
   * @param {string} content - Content from Google Docs
   * @returns {string} Formatted content with clean template
   */
  applySimpleTemplate(content) {
    if (!content || typeof content !== 'string') return content;

    // Format main content directly (เนื้อหาหลัก) - no greeting
    let mainContent = this.formatMainContent(content, '');
    
    // Add natural closing (คำปิดท้าย)
    const closing = `\n\nหากสนใจ สามารถสอบถามรายละเอียดเพิ่มเติมหรือนัดหมายเพื่อปรึกษาได้ตลอดเลยนะคะ 😊`;

    // Combine all parts
    const finalContent = mainContent + closing;

    return finalContent;
  }

  /**
   * Extract first meaningful sentence for greeting
   * @param {string} content - Content to analyze
   * @returns {string} First sentence
   */
  extractFirstSentence(content) {
    // Split by sentences and find the first meaningful one
    const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 15);
    return sentences[0] ? sentences[0].trim() : '';
  }

  /**
   * Format main content with proper structure
   * @param {string} content - Content to format
   * @param {string} firstSentence - First sentence to remove (not used)
   * @returns {string} Formatted content
   */
  formatMainContent(content, firstSentence) {
    let formatted = content;

    // Clean up existing formatting
    formatted = formatted.replace(/^[\s]*[-•]\s*(.+)$/gm, '• $1');
    formatted = formatted.replace(/^[\s]*\d+\.\s*(.+)$/gm, '• $1');

    // Format numbered sections (หัวข้อหลัก)
    formatted = this.formatNumberedSections(formatted);

    // Format bullet points (ข้อย่อย)
    formatted = this.formatBulletPoints(formatted);

    // Improve sentence structure for better readability
    formatted = this.improveSentenceStructure(formatted);

    // Add proper paragraph breaks
    formatted = this.addParagraphBreaks(formatted);

    // Clean up excessive whitespace
    formatted = this.cleanupWhitespace(formatted);

    return formatted;
  }

  /**
   * Format numbered sections
   * @param {string} content - Content to format
   * @returns {string} Formatted content
   */
  formatNumberedSections(content) {
    let formatted = content;

    // Format main headings (หัวข้อหลัก) - add line breaks around headings
    formatted = formatted.replace(/^([A-Za-z\u0E00-\u0E7F][^:]*:)$/gm, '\n$1\n');
    
    // Add line breaks before numbered sections
    formatted = formatted.replace(/([.!?])\s*\n\s*([A-Za-z\u0E00-\u0E7F][^:]*:)/g, '$1\n\n$2');

    return formatted;
  }

  /**
   * Format bullet points
   * @param {string} content - Content to format
   * @returns {string} Formatted content
   */
  formatBulletPoints(content) {
    let formatted = content;

    // Add line breaks before bullet points
    formatted = formatted.replace(/([.!?])\s*([•\-\*])\s*/g, '$1\n\n$2 ');
    formatted = formatted.replace(/([.!?])\s*(\d+\.)\s*/g, '$1\n\n$2 ');

    return formatted;
  }

  /**
   * Add proper paragraph breaks
   * @param {string} content - Content to format
   * @returns {string} Formatted content
   */
  addParagraphBreaks(content) {
    let formatted = content;

    // Analyze sentence structure for proper line breaks
    formatted = this.analyzeSentenceBreaks(formatted);

    // Add line breaks between paragraphs
    formatted = formatted.replace(/([.!?])\s*\n\s*([A-Za-z\u0E00-\u0E7F][^•\-\*:])/g, '$1\n\n$2');

    // Ensure proper spacing after punctuation
    formatted = formatted.replace(/([.!?])([A-Za-z\u0E00-\u0E7F])/g, '$1 $2');

    return formatted;
  }

  /**
   * Analyze sentence breaks for proper line formatting
   * @param {string} content - Content to analyze
   * @returns {string} Formatted content with proper line breaks
   */
  analyzeSentenceBreaks(content) {
    let formatted = content;

    // 1. Add line breaks after long sentences (more than 80 characters)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]{80,})/g, '$1\n\n$2');
    
    // 2. Add line breaks after sentences with multiple clauses (detect by comma patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*,[^.!?]*,[^.!?]*)/g, '$1\n\n$2');
    
    // 3. Add line breaks after sentences with lists or examples (detect by colon patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*:[^.!?]*)/g, '$1\n\n$2');
    
    // 4. Add line breaks after sentences with technical terms (detect by parentheses)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*\([^)]*\)[^.!?]*)/g, '$1\n\n$2');
    
    // 5. Add line breaks after sentences with contact information (detect by @ symbol or phone patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*[@\d-]{5,}[^.!?]*)/g, '$1\n\n$2');
    
    // 6. Add line breaks after sentences with pricing or numbers (detect by number patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*\d+[^.!?]*)/g, '$1\n\n$2');
    
    // 7. Add line breaks after sentences with features or benefits (detect by bullet-like patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*[-•][^.!?]*)/g, '$1\n\n$2');
    
    // 8. Add line breaks after sentences with instructions or steps (detect by numbered patterns)
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F][^.!?]*\d+\.\s*[^.!?]*)/g, '$1\n\n$2');

    return formatted;
  }

  /**
   * Improve sentence structure for better readability
   * @param {string} content - Content to improve
   * @returns {string} Improved content
   */
  improveSentenceStructure(content) {
    let formatted = content;

    // Remove greeting patterns from the beginning (Thai)
    formatted = formatted.replace(/^สวัสดีค่ะ\s*/gm, '');
    formatted = formatted.replace(/^สวัสดีครับ\s*/gm, '');
    
    // Remove greeting patterns from the beginning (English)
    formatted = formatted.replace(/^HappySmart\s+is\s+an\s+expert\s+in\s+designing\s+and\s+developing\s+intelligent\s+living\s+innovations\s*\(Intelligent\s+Living\s+Solutions\)\s*\.?\s*/gm, '');
    
    // Use simple formatting instead of AI to avoid async issues
    formatted = this.simpleFormatting(formatted);
    
    // Add proper spacing after punctuation
    formatted = formatted.replace(/([.!?])([A-Za-z\u0E00-\u0E7F])/g, '$1 $2');
    
    // Add line breaks after sentences for better readability
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F])/g, '$1\n\n$2');

    return formatted;
  }

  /**
   * Format content using AI for natural text formatting
   * @param {string} content - Content to format
   * @returns {string} AI-formatted content
   */
  async formatWithAI(content) {
    try {
      // Check if Gemini service is available
      if (this.geminiService && await this.geminiService.isAvailable()) {
        const prompt = `Please format the following Thai text to make it more readable and natural with proper paragraph breaks and spacing. Keep the original meaning and content intact, just improve the formatting:

${content}

Please return only the formatted text without any additional explanations.`;

        const aiResponse = await this.geminiService.generateResponse(prompt);
        return aiResponse || content;
      }
    } catch (error) {
      console.error('Error formatting with AI:', error);
    }
    
    // Fallback to simple formatting if AI is not available
    return this.simpleFormatting(content);
  }

  /**
   * Simple formatting fallback when AI is not available
   * @param {string} content - Content to format
   * @returns {string} Simply formatted content
   */
  simpleFormatting(content) {
    let formatted = content;

    // Add line breaks after sentences for better readability
    formatted = formatted.replace(/([.!?])\s*([A-Za-z\u0E00-\u0E7F])/g, '$1\n\n$2');
    
    // Add line breaks after colons
    formatted = formatted.replace(/([:])\s*([A-Za-z\u0E00-\u0E7F])/g, '$1\n\n$2');
    
    // Clean up excessive line breaks
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
  }

  /**
   * Clean up excessive whitespace
   * @param {string} content - Content to clean
   * @returns {string} Cleaned content
   */
  cleanupWhitespace(content) {
    let formatted = content;

    // Remove excessive line breaks (max 2 consecutive)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace
    formatted = formatted.trim();

    return formatted;
  }



  /**
   * Extract product/service name from content
   * @param {string} content - Content to analyze
   * @returns {string} Extracted product name
   */
  extractProductName(content) {
    // Look for common patterns to extract product/service name
    const patterns = [
      /สถาบัน[\s\w]+/i,
      /บริการ[\s\w]+/i,
      /หลักสูตร[\s\w]+/i,
      /คอร์ส[\s\w]+/i,
      /โปรแกรม[\s\w]+/i,
      /ระบบ[\s\w]+/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    // Default fallback
    return 'บริการของเรา';
  }


  /**
   * Get chatbot status
   * @returns {Object} Chatbot status
   */
  async getStatus() {
    return {
      initialized: this.isInitialized,
      services: {
        gemini: await this.geminiService.isAvailable(),
        googleDocs: await this.googleDocsService.isAvailable(),
        googleSheets: await this.googleSheetsService.isAvailable()
      },
      personality: this.botPersonality,
      keywordsCount: this.googleSheetsService.getKeywordsCount(),
      lastUpdate: this.googleSheetsService.lastUpdate
    };
  }

  /**
   * Refresh all data
   */
  async refreshData() {
    try {
      console.log('🔄 Refreshing chatbot data...');
      
      await this.loadBotPersonality();
      await this.googleSheetsService.refreshData();
      
      console.log('✅ Chatbot data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }
}

module.exports = { ChatbotService };
