# LINE AI Chatbot

แชทบอท AI สำหรับ LINE Official Account ที่ใช้ Gemini AI, Google Docs และ Google Sheets ในการตอบกลับและให้ข้อมูลช่วยเหลือลูกค้า

## ✨ ฟีเจอร์หลัก

- 🤖 **Gemini AI Integration** - ใช้ AI ของ Google ในการวิเคราะห์และตอบคำถาม
- 📄 **Google Docs Integration** - ระบุตัวตนและข้อมูลพื้นฐานของแชทบอท
- 📊 **Google Sheets Integration** - จัดการคีย์เวิร์ดและคำตอบสำเร็จรูป
- 🔍 **NLP Processing** - วิเคราะห์ข้อความและค้นหาคำสำคัญ
- 🎯 **Smart Keyword Matching** - ค้นหาคำตอบที่ตรงกับคีย์เวิร์ด
- 🌐 **LINE Messaging API** - เชื่อมต่อกับ LINE Official Account

## 🏗️ สถาปัตยกรรมระบบ

```
[ลูกค้า] → [LINE OA] → [Webhook] → [Node.js Server] → [AI Processing]
                                                      ↓
[Google Sheets] ← [Keyword Matching] ← [NLP Analysis]
[Google Docs] ← [Context Retrieval] ← [Gemini AI]
```

## 📋 ข้อกำหนดระบบ

- Node.js 18.0.0 หรือใหม่กว่า
- LINE Official Account
- Google Cloud Platform Account
- Gemini AI API Key

## 🚀 การติดตั้ง

### 1. Clone โปรเจค

```bash
git clone <repository-url>
cd line-ai-chatbot
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Environment Variables

คัดลอกไฟล์ `env.example` เป็น `.env` และกรอกข้อมูล:

```bash
cp env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# Google APIs Configuration
GOOGLE_CREDENTIALS_PATH=./credentials.json
GOOGLE_DOCS_ID=your_google_docs_id
GOOGLE_SHEETS_ID=your_google_sheets_id
GOOGLE_SHEETS_RANGE=ALL_SHEETS

# Server Configuration
PORT=3000
NODE_ENV=development

# Bot Configuration
BOT_NAME=AI Assistant
BOT_PERSONALITY=helpful, friendly, professional
DEFAULT_RESPONSE=ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือเพิ่มเติม
```

### 4. ตั้งค่า Google Cloud Platform

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจคใหม่หรือเลือกโปรเจคที่มีอยู่
3. เปิดใช้งาน APIs:
   - Google Docs API
   - Google Sheets API
4. สร้าง Service Account:
   - ไปที่ IAM & Admin > Service Accounts
   - สร้าง Service Account ใหม่
   - ดาวน์โหลดไฟล์ JSON credentials
   - เปลี่ยนชื่อไฟล์เป็น `credentials.json` และวางในโฟลเดอร์โปรเจค

### 5. ตั้งค่า Google Docs

1. สร้าง Google Docs ใหม่
2. เพิ่มเนื้อหาตามโครงสร้าง:

```
ชื่อบอท: AI Assistant ของบริษัท ABC
บุคลิกภาพ: เป็นมิตร, ช่วยเหลือ, เป็นมืออาชีพ, ใส่ใจลูกค้า
ตัวตน: แชทบอท AI ที่ช่วยตอบคำถามและให้ข้อมูลเกี่ยวกับผลิตภัณฑ์และบริการ
โทนเสียง: เป็นมิตร, อุ่นใจ, เป็นมืออาชีพ
ภาษา: thai
คำตอบเริ่มต้น: ขออภัยค่ะ ไม่สามารถตอบคำถามนี้ได้ในขณะนี้ กรุณาติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือเพิ่มเติม
ข้อมูลธุรกิจ: [ข้อมูลพื้นฐานของธุรกิจ]

[เนื้อหาอื่นๆ ที่ต้องการให้แชทบอทใช้เป็นข้อมูลพื้นฐาน]
```

3. แชร์เอกสารกับ Service Account email (จากไฟล์ credentials.json)
4. คัดลอก Document ID จาก URL

**หมายเหตุ:** การตั้งค่าใน Google Docs จะมีความสำคัญเหนือกว่าการตั้งค่าในไฟล์ `.env`

### 6. ตั้งค่า Google Sheets

1. สร้าง Google Sheets ใหม่
2. ตั้งค่าตารางในแต่ละหน้า:
   - คอลัมน์ B: คีย์เวิร์ด
   - คอลัมน์ C: คำตอบ
3. เพิ่มข้อมูลตัวอย่าง:

**หน้า Sheet1:**
| A | B (คีย์เวิร์ด) | C (คำตอบ) |
|---|---|---|
| 1 | ราคา | ราคาสินค้าของเราอยู่ที่... |
| 2 | เวลาทำการ | เราทำการในเวลา... |
| 3 | ที่อยู่ | ที่อยู่ของเราอยู่ที่... |

**หน้า Sheet2 (ถ้ามี):**
| A | B (คีย์เวิร์ด) | C (คำตอบ) |
|---|---|---|
| 1 | ติดต่อ | สามารถติดต่อเราได้ที่... |
| 2 | ขอบคุณ | ยินดีให้บริการค่ะ... |

4. แชร์สเปรดชีตกับ Service Account email
5. คัดลอก Spreadsheet ID จาก URL

**หมายเหตุ:** ระบบจะตรวจสอบทุกหน้าใน Google Sheets โดยอัตโนมัติ หากต้องการระบุหน้าเฉพาะ ให้ใช้ `GOOGLE_SHEETS_RANGE=Sheet1!B:C`

### 7. ตั้งค่า LINE Official Account

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider และ Channel
3. เปิดใช้งาน Messaging API
4. ตั้งค่า Webhook URL: `https://your-domain.com/webhook`
5. คัดลอก Channel Access Token และ Channel Secret

### 8. ตั้งค่า Gemini AI

1. ไปที่ [Google AI Studio](https://ai.google.dev/)
2. สร้าง API Key
3. คัดลอก API Key ไปใส่ในไฟล์ `.env`

## 🏃‍♂️ การรัน

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## 📁 โครงสร้างโปรเจค

```
line-ai-chatbot/
├── services/
│   ├── geminiService.js      # Gemini AI integration
│   ├── googleDocsService.js  # Google Docs API (มี Cache & Lock)
│   ├── googleSheetsService.js # Google Sheets API
│   ├── nlpService.js         # Natural Language Processing
│   ├── chatbotService.js     # Main chatbot logic
│   └── autoRefreshService.js # Auto refresh service
├── templates/
│   ├── google-docs-template.md    # เทมเพลต Google Docs
│   └── google-sheets-template.md  # เทมเพลต Google Sheets
├── docs/
│   ├── API.md                    # คู่มือ API
│   ├── DEPLOYMENT.md             # คู่มือการ Deploy
│   ├── GOOGLE_SHEETS_SETUP.md    # คู่มือการตั้งค่า Google Sheets
│   ├── GOOGLE_DOCS_CONFIGURATION.md # คู่มือการตั้งค่า Google Docs
│   └── SETUP_TEMPLATES.md        # คู่มือการตั้งค่าเทมเพลต
├── sample-google-docs-content.txt    # ตัวอย่างเนื้อหา Google Docs
├── sample-google-sheets-content.csv  # ตัวอย่างเนื้อหา Google Sheets
├── index.js                  # Main application file
├── package.json              # Dependencies
├── env.example              # Environment variables template
├── credentials.json         # Google API credentials (not in git)
├── .env                     # Environment variables (not in git)
└── README.md                # This file
```

## 🔧 การใช้งาน

### หลักการทำงาน

1. **ลูกค้าส่งข้อความ** → LINE Official Account
2. **ระบบรับข้อความ** → Webhook endpoint
3. **วิเคราะห์ข้อความ** → NLP Service
4. **ค้นหาคีย์เวิร์ด** → Google Sheets
5. **หากพบคีย์เวิร์ด** → ส่งคำตอบสำเร็จรูป
6. **หากไม่พบ** → ใช้ Gemini AI + Google Docs
7. **ส่งคำตอบกลับ** → LINE Official Account

### การเพิ่มคีย์เวิร์ดใหม่

1. เปิด Google Sheets
2. เพิ่มคีย์เวิร์ดในคอลัมน์ B
3. เพิ่มคำตอบในคอลัมน์ C
4. ระบบจะโหลดข้อมูลใหม่อัตโนมัติทุก 1 ชั่วโมง

### การอัปเดตข้อมูลแชทบอท

1. แก้ไข Google Docs
2. ระบบจะใช้ข้อมูลใหม่ในการตอบคำถามทันที

## 🛠️ การพัฒนา

### การเพิ่มฟีเจอร์ใหม่

1. สร้าง service ใหม่ในโฟลเดอร์ `services/`
2. เพิ่มการเรียกใช้ใน `chatbotService.js`
3. อัปเดต `index.js` หากจำเป็น

### การทดสอบ

```bash
# ทดสอบการเชื่อมต่อ
curl http://localhost:3000/

# ทดสอบ webhook (ใช้ ngrok สำหรับ local development)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"message","message":{"type":"text","text":"สวัสดี"}}]}'
```

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **Google API ไม่ทำงาน**
   - ตรวจสอบไฟล์ `credentials.json`
   - ตรวจสอบการแชร์เอกสารกับ Service Account

2. **LINE Bot ไม่ตอบกลับ**
   - ตรวจสอบ Channel Access Token และ Channel Secret
   - ตรวจสอบ Webhook URL

3. **Gemini AI ไม่ทำงาน**
   - ตรวจสอบ API Key
   - ตรวจสอบการเรียกใช้ API

### Logs

```bash
# ดู logs
npm run dev

# หรือ
node index.js
```

## 📝 License

MIT License

## 🤝 การสนับสนุน

หากมีปัญหาหรือข้อสงสัย กรุณาสร้าง Issue ใน GitHub repository

## 📞 ติดต่อ

- **Developer**: Boss Phiriyakorn
- **Email**: [your-email@example.com]
- **GitHub**: [your-github-username]

---

**หมายเหตุ**: โปรเจคนี้พัฒนาขึ้นเพื่อการศึกษาและใช้งานจริง ควรทดสอบให้ดีก่อนนำไปใช้งานในระบบ production
