# LINE AI Chatbot

AI Chat Bot สำหรับ LINE Official Account ที่ใช้ Gemini AI, Google Docs และ Google Sheets เพื่อตอบคำถามลูกค้าอัตโนมัติ 24 ชั่วโมง

## คุณสมบัติ

- 🤖 ใช้ Gemini AI ในการวิเคราะห์เจตนาและสร้างคำตอบ
- 📄 ใช้ Google Docs เก็บข้อมูลตัวตนและบริบทของธุรกิจ
- 📊 ใช้ Google Sheets เก็บคำตอบสำเร็จรูปตามคีย์เวิร์ด
- 🔄 วิเคราะห์คำถามและเลือกแหล่งข้อมูลที่เหมาะสม
- 🛡️ ระบบรักษาความปลอดภัยด้วย LINE Webhook signature verification
- 📝 ระบบ logging และ error handling ที่ครบถ้วน

## สถาปัตยกรรมระบบ

```
ลูกค้าส่งข้อความใน LINE OA
        ↓
LINE Messaging API ส่ง Webhook
        ↓
Node.js Server รับและประมวลผล
        ↓
Gemini AI วิเคราะห์เจตนา
        ↓
┌─────────────────┬─────────────────┐
│   Keyword-based │ General Inquiry │
│   (Google Sheets)│   (Google Docs) │
└─────────────────┴─────────────────┘
        ↓
ส่งคำตอบกลับให้ลูกค้า
```

## การติดตั้ง

### 1. Clone Repository

```bash
git clone <repository-url>
cd line-ai-chatbot
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

คัดลอกไฟล์ `env.example` เป็น `.env` และกรอกข้อมูลที่จำเป็น:

```bash
cp env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# LINE Messaging API Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Google AI (Gemini) Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Google Docs Configuration
GOOGLE_DOCS_ID=your_google_docs_id
GOOGLE_CREDENTIALS_PATH=./google-credentials.json

# Google Sheets Configuration
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SHEETS_RANGE=Sheet1!B:C

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 4. ตั้งค่า Google Cloud Services

#### Google AI (Gemini)
1. ไปที่ [Google AI Studio](https://makersuite.google.com/app/apikey)
2. สร้าง API Key สำหรับ Gemini
3. ใส่ API Key ในไฟล์ `.env`

#### Google Docs & Sheets
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน Google Docs API และ Google Sheets API
4. สร้าง Service Account
5. ดาวน์โหลด JSON key file
6. เปลี่ยนชื่อไฟล์เป็น `google-credentials.json` และวางในโฟลเดอร์หลัก
7. ใส่ข้อมูลในไฟล์ `.env`

### 5. ตั้งค่า LINE Official Account

1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Channel ใหม่
3. เปิดใช้งาน Messaging API
4. ตั้งค่า Webhook URL: `https://your-domain.com/webhook`
5. ใส่ Channel Access Token และ Channel Secret ในไฟล์ `.env`

## การใช้งาน

### 1. เริ่มต้น Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 2. ตั้งค่า Google Docs

สร้างเอกสาร Google Docs และใส่ข้อมูลต่อไปนี้:
- ข้อมูลตัวตนของธุรกิจ
- ข้อมูลผลิตภัณฑ์/บริการ
- ข้อมูลติดต่อ
- ข้อมูลอื่นๆ ที่เกี่ยวข้อง

### 3. ตั้งค่า Google Sheets

สร้าง Google Sheets และตั้งค่าดังนี้:
- คอลัมน์ B: คีย์เวิร์ด
- คอลัมน์ C: คำตอบ

ตัวอย่าง:
| A | B (Keyword) | C (Answer) |
|---|---|---|
| 1 | ราคา | ราคาเริ่มต้นที่ 1,000 บาท |
| 2 | ชำระเงิน | รับชำระเงินผ่าน... |
| 3 | ส่งสินค้า | ส่งสินค้าภายใน 3-5 วันทำการ |

## โครงสร้างโปรเจค

```
src/
├── app.js                 # Main application file
├── config/
│   └── index.js          # Configuration management
├── handlers/
│   └── lineHandler.js    # LINE webhook handler
├── services/
│   ├── chatService.js    # Main chat logic
│   ├── geminiService.js  # Gemini AI integration
│   ├── googleDocsService.js # Google Docs integration
│   ├── googleSheetsService.js # Google Sheets integration
│   └── lineService.js    # LINE API integration
└── utils/
    ├── errorHandler.js   # Error handling middleware
    └── logger.js         # Logging utility
```

## API Endpoints

### POST /webhook
รับ webhook จาก LINE Messaging API

### GET /health
ตรวจสอบสถานะของระบบ

## การทำงานของระบบ

1. **รับข้อความ**: ระบบรับข้อความจาก LINE Official Account
2. **วิเคราะห์เจตนา**: Gemini AI วิเคราะห์ว่าข้อความเป็น keyword-based หรือ general inquiry
3. **ค้นหาคำตอบ**:
   - หากเป็น keyword-based: ค้นหาใน Google Sheets
   - หากเป็น general inquiry: ใช้ข้อมูลจาก Google Docs + Gemini AI
4. **ส่งคำตอบ**: ส่งคำตอบกลับให้ลูกค้าผ่าน LINE API

## การ Debug และ Monitoring

### Logs
ระบบจะสร้าง log files ในโฟลเดอร์ `logs/`:
- `error.log`: ข้อผิดพลาด
- `combined.log`: ข้อมูลทั้งหมด

### Health Check
ตรวจสอบสถานะระบบที่: `GET /health`

## การ Deploy

### 1. Heroku
```bash
# ติดตั้ง Heroku CLI
npm install -g heroku

# Login และสร้าง app
heroku login
heroku create your-app-name

# ตั้งค่า environment variables
heroku config:set LINE_CHANNEL_ACCESS_TOKEN=your_token
heroku config:set LINE_CHANNEL_SECRET=your_secret
# ... ตั้งค่าตัวแปรอื่นๆ

# Deploy
git push heroku main
```

### 2. Railway
```bash
# ติดตั้ง Railway CLI
npm install -g @railway/cli

# Login และสร้าง project
railway login
railway init

# ตั้งค่า environment variables
railway variables set LINE_CHANNEL_ACCESS_TOKEN=your_token
# ... ตั้งค่าตัวแปรอื่นๆ

# Deploy
railway up
```

## การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **Webhook ไม่ทำงาน**
   - ตรวจสอบ URL webhook ใน LINE Developers Console
   - ตรวจสอบ SSL certificate
   - ตรวจสอบ firewall settings

2. **Google API ไม่ทำงาน**
   - ตรวจสอบ Service Account permissions
   - ตรวจสอบ API keys
   - ตรวจสอบ document/sheet IDs

3. **Gemini AI ไม่ตอบ**
   - ตรวจสอบ API key
   - ตรวจสอบ quota และ rate limits
   - ตรวจสอบ internet connection

## การพัฒนาต่อ

### เพิ่มฟีเจอร์ใหม่
1. ระบบเก็บประวัติการสนทนา
2. ระบบส่งข้อความแจ้งเตือน
3. ระบบวิเคราะห์ความรู้สึก
4. ระบบ multi-language support

### Customization
- แก้ไข prompt ใน `geminiService.js`
- เพิ่มการประมวลผลข้อความใน `chatService.js`
- เพิ่ม validation ใน `lineHandler.js`

## License

MIT License

## ผู้พัฒนา

Boss Phiriyakorn

## การสนับสนุน

หากมีปัญหาหรือคำถาม กรุณาติดต่อทีมพัฒนา
