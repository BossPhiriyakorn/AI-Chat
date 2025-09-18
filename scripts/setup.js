#!/usr/bin/env node

/**
 * Setup script for LINE AI Chatbot
 * This script helps users set up the chatbot project
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 LINE AI Chatbot Setup');
  console.log('========================\n');

  try {
    // Check if .env exists
    if (fs.existsSync('.env')) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ Setup cancelled');
        process.exit(0);
      }
    }

    console.log('\n📝 Please provide the following information:\n');

    // LINE Bot Configuration
    console.log('🔵 LINE Bot Configuration:');
    const lineChannelAccessToken = await question('LINE Channel Access Token: ');
    const lineChannelSecret = await question('LINE Channel Secret: ');

    // Gemini AI Configuration
    console.log('\n🤖 Gemini AI Configuration:');
    const geminiApiKey = await question('Gemini API Key: ');
    const geminiModel = await question('Gemini Model (default: gemini-1.5-flash): ') || 'gemini-1.5-flash';

    // Google APIs Configuration
    console.log('\n📄 Google APIs Configuration:');
    const googleDocsId = await question('Google Docs ID: ');
    const googleSheetsId = await question('Google Sheets ID: ');
    const googleSheetsRange = await question('Google Sheets Range (default: Sheet1!B:C): ') || 'Sheet1!B:C';

    // Server Configuration
    console.log('\n⚙️  Server Configuration:');
    const port = await question('Port (default: 3000): ') || '3000';
    const nodeEnv = await question('Node Environment (development/production, default: development): ') || 'development';

    // Bot Configuration (Optional - Can be overridden by Google Docs)
    console.log('\n🤖 Bot Configuration (Optional - Can be overridden by Google Docs):');
    const botName = await question('Bot Name (default: AI Assistant): ') || 'AI Assistant';
    const botPersonality = await question('Bot Personality (default: helpful, friendly, professional): ') || 'helpful, friendly, professional';
    const defaultResponse = await question('Default Response (default: ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้): ') || 'ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือเพิ่มเติม';

    // Create .env file
    const envContent = `# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=${lineChannelAccessToken}
LINE_CHANNEL_SECRET=${lineChannelSecret}

# Gemini AI Configuration
GEMINI_API_KEY=${geminiApiKey}
GEMINI_MODEL=${geminiModel}

# Google APIs Configuration
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_DOCS_ID=${googleDocsId}
GOOGLE_SHEETS_ID=${googleSheetsId}
GOOGLE_SHEETS_RANGE=${googleSheetsRange}

# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Bot Configuration
BOT_NAME=${botName}
BOT_PERSONALITY=${botPersonality}
DEFAULT_RESPONSE=${defaultResponse}
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n✅ .env file created successfully!');

    // Check if credentials.json exists
    if (!fs.existsSync('credentials.json')) {
      console.log('\n⚠️  credentials.json not found!');
      console.log('Please download your Google Cloud Service Account credentials and save as credentials.json');
      console.log('Instructions:');
      console.log('1. Go to Google Cloud Console');
      console.log('2. Create or select a project');
      console.log('3. Enable Google Docs API and Google Sheets API');
      console.log('4. Create a Service Account');
      console.log('5. Download the JSON key file');
      console.log('6. Rename it to credentials.json and place it in the project root');
    } else {
      console.log('✅ credentials.json found');
    }

    // Create sample Google Docs content
    const sampleDocsContent = `ชื่อบอท: ${botName}
บุคลิกภาพ: ${botPersonality}
ตัวตน: แชทบอท AI ที่ช่วยตอบคำถามและให้ข้อมูลเกี่ยวกับผลิตภัณฑ์และบริการ
โทนเสียง: เป็นมิตร, อุ่นใจ, เป็นมืออาชีพ
ภาษา: thai
คำตอบเริ่มต้น: ${defaultResponse}
ข้อมูลธุรกิจ: [กรุณาเพิ่มข้อมูลธุรกิจของคุณที่นี่]

ข้อมูลเพิ่มเติม:
- ข้อมูลเกี่ยวกับผลิตภัณฑ์/บริการ
- ข้อมูลการติดต่อ
- ข้อมูลที่ลูกค้าอาจถามบ่อย
- ข้อมูลอื่นๆ ที่ต้องการให้แชทบอทรู้`;

    fs.writeFileSync('sample-google-docs-content.txt', sampleDocsContent);
    console.log('✅ Sample Google Docs content created (sample-google-docs-content.txt)');

    // Create sample Google Sheets content
    const sampleSheetsContent = `คีย์เวิร์ด,คำตอบ
สวัสดี,สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา มีอะไรให้ช่วยเหลือไหมคะ
ราคา,ราคาสินค้าของเราอยู่ที่ [กรุณาเพิ่มราคา] บาท
เวลาทำการ,เราทำการในเวลา [กรุณาเพิ่มเวลาทำการ]
ที่อยู่,ที่อยู่ของเราอยู่ที่ [กรุณาเพิ่มที่อยู่]
ติดต่อ,สามารถติดต่อเราได้ที่ [กรุณาเพิ่มข้อมูลการติดต่อ]
ขอบคุณ,ยินดีให้บริการค่ะ ขอบคุณที่ใช้บริการของเรา`;

    fs.writeFileSync('sample-google-sheets-content.csv', sampleSheetsContent);
    console.log('✅ Sample Google Sheets content created (sample-google-sheets-content.csv)');

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy the content from sample-google-docs-content.txt to your Google Docs');
    console.log('2. Import sample-google-sheets-content.csv to your Google Sheets');
    console.log('3. Share your Google Docs and Google Sheets with your Service Account email');
    console.log('4. Edit your Google Docs to customize bot configuration');
    console.log('5. Run: npm start');
    console.log('\n🔗 Useful links:');
    console.log('- Google Cloud Console: https://console.cloud.google.com/');
    console.log('- LINE Developers Console: https://developers.line.biz/console/');
    console.log('- Google AI Studio: https://ai.google.dev/');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setup();
