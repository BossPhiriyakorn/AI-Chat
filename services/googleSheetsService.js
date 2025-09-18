const { google } = require('googleapis');
const fs = require('fs');

class GoogleSheetsService {
  constructor() {
    this.sheetsId = process.env.GOOGLE_SHEETS_ID;
    this.range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!B:C';
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    this.auth = null;
    this.sheets = null;
    this.keywordsData = [];
    this.lastUpdate = null;
    this.sheetNames = []; // Store available sheet names
    
    if (!this.sheetsId) {
      console.warn('GOOGLE_SHEETS_ID not provided, Google Sheets service will be disabled');
    }
  }

  /**
   * Initialize Google Sheets API
   */
  async initialize() {
    try {
      if (!fs.existsSync(this.credentialsPath)) {
        throw new Error(`Credentials file not found: ${this.credentialsPath}`);
      }

      const credentials = JSON.parse(fs.readFileSync(this.credentialsPath, 'utf8'));
      
      this.auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      
      // Load initial data
      await this.loadKeywordsData();
      
      console.log('✅ Google Sheets service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets service:', error.message);
      console.error('Full error details:', error);
      this.sheets = null;
    }
  }

  /**
   * Get all sheet names from the spreadsheet
   */
  async getSheetNames() {
    if (!this.sheets || !this.sheetsId) {
      return [];
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetsId,
      });

      const sheets = response.data.sheets || [];
      return sheets.map(sheet => sheet.properties.title);
    } catch (error) {
      console.error('Error getting sheet names:', error);
      return [];
    }
  }

  /**
   * Load keywords data from Google Sheets
   */
  async loadKeywordsData() {
    if (!this.sheets || !this.sheetsId) {
      return;
    }

    try {
      // Get all sheet names first
      this.sheetNames = await this.getSheetNames();
      console.log(`📋 Available sheets: ${this.sheetNames.join(', ')}`);

      let allKeywordsData = [];

      // If range is specified, use it; otherwise, search all sheets
      if (this.range && this.range !== 'ALL_SHEETS') {
        // Use specific range
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.sheetsId,
          range: this.range,
        });

        const rows = response.data.values || [];
        allKeywordsData = rows.map((row, index) => ({
          id: index + 1,
          keyword: row[0] || '',
          answer: row[1] || '',
          originalKeyword: row[0] || '',
          sheet: this.range.split('!')[0] || 'Sheet1'
        }));
      } else {
        // Search all sheets
        for (const sheetName of this.sheetNames) {
          try {
            const response = await this.sheets.spreadsheets.values.get({
              spreadsheetId: this.sheetsId,
              range: `${sheetName}!B:C`, // Assuming B:C format for all sheets
            });

            const rows = response.data.values || [];
            const sheetKeywords = rows.map((row, index) => ({
              id: allKeywordsData.length + index + 1,
              keyword: row[0] || '',
              answer: row[1] || '',
              originalKeyword: row[0] || '',
              sheet: sheetName
            }));

            allKeywordsData = allKeywordsData.concat(sheetKeywords);
            console.log(`📊 Loaded ${sheetKeywords.length} keywords from sheet: ${sheetName}`);
          } catch (sheetError) {
            console.warn(`⚠️ Could not load data from sheet: ${sheetName}`, sheetError.message);
          }
        }
      }

      this.keywordsData = allKeywordsData;
      this.lastUpdate = new Date();
      console.log(`📊 Total loaded ${this.keywordsData.length} keywords from Google Sheets`);
      
      // Log all keywords for debugging
      console.log('📝 Available keywords:', this.keywordsData.map(item => item.keyword).join(', '));
    } catch (error) {
      console.error('Error loading keywords data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        response: error.response?.data
      });
      this.keywordsData = [];
    }
  }

  /**
   * Refresh keywords data
   */
  async refreshData() {
    await this.loadKeywordsData();
  }

  /**
   * Find matching keyword and answer with improved AI analysis
   * @param {string} userMessage - User's message
   * @param {number} threshold - Similarity threshold (0-1)
   * @returns {Object|null} Matching keyword and answer
   */
  findMatchingKeyword(userMessage, threshold = 0.6) {
    if (this.keywordsData.length === 0) {
      console.log('❌ No keywords data available');
      return null;
    }

    const message = userMessage.toLowerCase().trim();
    let bestMatch = null;
    let bestScore = 0;

    console.log(`🔍 Searching for keyword match in ${this.keywordsData.length} keywords`);
    console.log(`🔍 User message: "${userMessage}"`);

    // First pass: Exact match (including partial matches)
    for (const item of this.keywordsData) {
      if (!item.keyword) continue;

      const keyword = item.keyword.toLowerCase().trim();
      
      // Exact match
      if (message === keyword) {
        console.log(`✅ Exact match found: "${item.originalKeyword}" for message: "${userMessage}"`);
        return {
          keyword: item.originalKeyword,
          answer: item.answer,
          score: 1.0,
          matchType: 'exact'
        };
      }

      // Partial match - check if message contains keyword or vice versa
      if (message.includes(keyword) || keyword.includes(message)) {
        console.log(`✅ Partial match found: "${item.originalKeyword}" for message: "${userMessage}"`);
        return {
          keyword: item.originalKeyword,
          answer: item.answer,
          score: 0.9,
          matchType: 'partial'
        };
      }
    }

    // Second pass: Word-by-word analysis with better matching
    const messageWords = message.split(/\s+/);
    console.log(`🔍 Analyzing words: [${messageWords.join(', ')}]`);

    for (const item of this.keywordsData) {
      if (!item.keyword) continue;

      const keyword = item.keyword.toLowerCase().trim();
      const keywordWords = keyword.split(/\s+/);
      
      let matchCount = 0;
      let totalWords = Math.max(messageWords.length, keywordWords.length);
      
      // Check each word in user message against keyword words
      for (const messageWord of messageWords) {
        for (const keywordWord of keywordWords) {
          if (messageWord === keywordWord || 
              messageWord.includes(keywordWord) || 
              keywordWord.includes(messageWord)) {
            matchCount++;
            console.log(`🔍 Word match: "${messageWord}" matches "${keywordWord}"`);
            break;
          }
        }
      }

      const score = matchCount / totalWords;
      
      if (score >= threshold && score > bestScore) {
        bestMatch = {
          keyword: item.originalKeyword,
          answer: item.answer,
          score: score,
          matchType: 'word_match'
        };
        bestScore = score;
        console.log(`🔍 Word match found: "${item.originalKeyword}" (score: ${score.toFixed(2)}) for message: "${userMessage}"`);
      }
    }

    // Third pass: Fuzzy matching for similar words
    if (!bestMatch) {
      for (const item of this.keywordsData) {
        if (!item.keyword) continue;

        const keyword = item.keyword.toLowerCase().trim();
        const keywordWords = keyword.split(/\s+/);
        
        // Check for similar words (fuzzy matching)
        for (const messageWord of messageWords) {
          for (const keywordWord of keywordWords) {
            // Check if words are similar (at least 60% similar)
            if (this.calculateSimilarity(messageWord, keywordWord) >= 0.6) {
              const score = 0.4; // Lower score for fuzzy match
              if (score > bestScore) {
                bestMatch = {
                  keyword: item.originalKeyword,
                  answer: item.answer,
                  score: score,
                  matchType: 'fuzzy'
                };
                bestScore = score;
                console.log(`🔍 Fuzzy match found: "${item.originalKeyword}" (score: ${score.toFixed(2)}) for message: "${userMessage}"`);
              }
            }
          }
        }
      }
    }

    // Fourth pass: Check for specific contact types
    if (!bestMatch) {
      // Check for email-specific requests
      const emailTerms = ['อีเมล', 'email', 'e-mail', 'เมล'];
      const hasEmailTerm = emailTerms.some(term => message.includes(term));
      
      if (hasEmailTerm) {
        // Look for email-specific keywords
        for (const item of this.keywordsData) {
          if (!item.keyword) continue;
          
          const keyword = item.keyword.toLowerCase().trim();
          if (keyword.includes('อีเมล') || keyword.includes('email')) {
            console.log(`🔍 Email-specific match found: "${item.originalKeyword}" for message: "${userMessage}"`);
            return {
              keyword: item.originalKeyword,
              answer: item.answer,
              score: 0.4,
              matchType: 'email_specific'
            };
          }
        }
      }
      
      // Check for phone-specific requests
      const phoneTerms = ['เบอร์', 'โทร', 'เบอร์โทร', 'phone', 'tel'];
      const hasPhoneTerm = phoneTerms.some(term => message.includes(term));
      
      if (hasPhoneTerm) {
        // Look for phone-specific keywords
        for (const item of this.keywordsData) {
          if (!item.keyword) continue;
          
          const keyword = item.keyword.toLowerCase().trim();
          if (keyword.includes('เบอร์') || keyword.includes('โทร')) {
            console.log(`🔍 Phone-specific match found: "${item.originalKeyword}" for message: "${userMessage}"`);
            return {
              keyword: item.originalKeyword,
              answer: item.answer,
              score: 0.4,
              matchType: 'phone_specific'
            };
          }
        }
      }
      
      // Check for general contact requests
      const contactTerms = ['ติดต่อ', 'ข้อมูล', 'contact'];
      const hasContactTerm = contactTerms.some(term => message.includes(term));
      
      if (hasContactTerm) {
        // Look for any keyword that contains contact-related terms
        for (const item of this.keywordsData) {
          if (!item.keyword) continue;
          
          const keyword = item.keyword.toLowerCase().trim();
          const hasKeywordContactTerm = contactTerms.some(term => keyword.includes(term));
          
          if (hasKeywordContactTerm) {
            console.log(`🔍 Contact term match found: "${item.originalKeyword}" for message: "${userMessage}"`);
            return {
              keyword: item.originalKeyword,
              answer: item.answer,
              score: 0.3,
              matchType: 'contact_term'
            };
          }
        }
      }
    }

    if (bestMatch) {
      console.log(`✅ Best match: "${bestMatch.keyword}" (score: ${bestMatch.score.toFixed(2)}, type: ${bestMatch.matchType})`);
    } else {
      console.log(`❌ No match found for message: "${userMessage}"`);
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Find multiple matching keywords
   * @param {string} userMessage - User's message
   * @param {number} threshold - Similarity threshold (0-1)
   * @param {number} limit - Maximum number of results
   * @returns {Array} Array of matching keywords
   */
  findMultipleMatches(userMessage, threshold = 0.5, limit = 5) {
    if (this.keywordsData.length === 0) {
      return [];
    }

    const message = userMessage.toLowerCase().trim();
    const matches = [];

    for (const item of this.keywordsData) {
      if (!item.keyword) continue;

      const keyword = item.keyword.toLowerCase().trim();
      
      // Calculate similarity score
      const words = message.split(/\s+/);
      const keywordWords = keyword.split(/\s+/);
      
      let matchCount = 0;
      for (const word of words) {
        for (const keywordWord of keywordWords) {
          if (word.includes(keywordWord) || keywordWord.includes(word)) {
            matchCount++;
            break;
          }
        }
      }

      const score = matchCount / Math.max(words.length, keywordWords.length);
      
      if (score >= threshold) {
        matches.push({
          keyword: item.originalKeyword,
          answer: item.answer,
          score: score,
          matchType: score === 1.0 ? 'exact' : 'partial'
        });
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get all keywords data
   * @returns {Array} All keywords data
   */
  getAllKeywords() {
    return this.keywordsData;
  }

  /**
   * Get keywords from specific sheet
   * @param {string} sheetName - Name of the sheet
   * @returns {Array} Keywords from specific sheet
   */
  getKeywordsFromSheet(sheetName) {
    return this.keywordsData.filter(item => item.sheet === sheetName);
  }

  /**
   * Get available sheet names
   * @returns {Array} Available sheet names
   */
  getAvailableSheets() {
    return this.sheetNames;
  }

  /**
   * Get keywords count
   * @returns {number} Number of keywords
   */
  getKeywordsCount() {
    return this.keywordsData.length;
  }

  /**
   * Check if data needs refresh (older than 5 minutes)
   * @returns {boolean} Whether data needs refresh
   */
  needsRefresh() {
    if (!this.lastUpdate) return true;
    
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (new Date() - this.lastUpdate) > fiveMinutes;
  }

  /**
   * Check if the service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      if (!this.sheets || !this.sheetsId) {
        return false;
      }
      
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.sheetsId
      });
      
      return true;
    } catch (error) {
      console.error('Google Sheets service unavailable:', error);
      return false;
    }
  }
}

module.exports = { GoogleSheetsService };