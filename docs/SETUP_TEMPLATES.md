# คู่มือการตั้งค่าเทมเพลตสำหรับแชทบอท AI

## 📋 ภาพรวม

คู่มือนี้จะช่วยคุณในการตั้งค่า Google Docs และ Google Sheets สำหรับแชทบอท AI ให้ถูกต้องและมีประสิทธิภาพ

## 🏗️ โครงสร้างไฟล์

```
templates/
├── google-docs-template.md          # เทมเพลตสำหรับ Google Docs
├── google-sheets-template.md        # เทมเพลตสำหรับ Google Sheets
└── sample-google-docs-content.txt   # ตัวอย่างเนื้อหา Google Docs
└── sample-google-sheets-content.csv # ตัวอย่างเนื้อหา Google Sheets
```

## 📄 การตั้งค่า Google Docs

### 1. สร้างเอกสารใหม่
1. ไปที่ [Google Docs](https://docs.google.com)
2. สร้างเอกสารใหม่
3. ใช้ชื่อไฟล์: `Chatbot-AI-Configuration`

### 2. ใช้เทมเพลตมาตรฐาน
1. เปิดไฟล์ `templates/google-docs-template.md`
2. คัดลอกเนื้อหาตามโครงสร้างที่กำหนด
3. แก้ไขข้อมูลให้ตรงกับธุรกิจของคุณ

### 3. โครงสร้างที่จำเป็น (2 ส่วนหลัก)

#### ส่วนที่ 1: ข้อมูลพื้นฐานของบอท
```
**ชื่อบอท:** [ชื่อบอทของคุณ]
**บุคลิกภาพ:** [อธิบายบุคลิกภาพของบอท]
**ตัวตน:** [อธิบายตัวตนและบทบาทของบอท]
**ภาษา:** [ภาษาในการตอบกลับ]
**โทนเสียง:** [โทนเสียงในการตอบกลับ]
**คำตอบเริ่มต้น:** [คำตอบเมื่อไม่สามารถตอบได้]
```

#### ส่วนที่ 2: ข้อมูลทั่วไป/ข้อมูลธุรกิจ
```
**ข้อมูลธุรกิจ:** [ข้อมูลเกี่ยวกับธุรกิจของคุณ]
**ข้อมูลบริษัท:** [ข้อมูลเกี่ยวกับบริษัท]
**ผลิตภัณฑ์และบริการ:** [ข้อมูลผลิตภัณฑ์และบริการ]
**ข้อมูลติดต่อ:** [ข้อมูลการติดต่อ]
**ข้อมูลเพิ่มเติม:** [ข้อมูลอื่นๆ ที่เกี่ยวข้อง]
**นโยบายและเงื่อนไข:** [นโยบายและเงื่อนไขต่างๆ]
**ข้อมูลสำคัญ:** [ข้อมูลสำคัญอื่นๆ]
```

**หมายเหตุ:** ส่วนที่ 2 เป็นข้อมูลรวมที่คุณสามารถใส่ข้อมูลใดๆ ก็ได้ตามต้องการ

## 📊 การตั้งค่า Google Sheets

### 1. สร้างตารางใหม่
1. ไปที่ [Google Sheets](https://sheets.google.com)
2. สร้างตารางใหม่
3. ใช้ชื่อไฟล์: `Chatbot-AI-Keywords`

### 2. ใช้เทมเพลตมาตรฐาน
1. เปิดไฟล์ `templates/google-sheets-template.md`
2. ใช้โครงสร้างตามที่กำหนด
3. ใส่ข้อมูลคีย์เวิร์ดและคำตอบ

### 3. โครงสร้างที่จำเป็น
- **คอลัมน์ B:** คีย์เวิร์ด (Keywords)
- **คอลัมน์ C:** คำตอบ (Answers)

### 4. ตัวอย่างข้อมูล
| คอลัมน์ B | คอลัมน์ C |
|-----------|-----------|
| สวัสดี | สวัสดีค่ะ ยินดีต้อนรับสู่บริการของเรา |
| เบอร์โทรติดต่อ | เบอร์โทรศัพท์ติดต่อ: 02-123-4567 |
| อีเมลติดต่อ | อีเมลติดต่อ: info@company.com |

## 🔧 การตั้งค่าในระบบ

### 1. ตั้งค่า Environment Variables
```bash
# Google Docs
GOOGLE_DOCS_ID=your_document_id_here

# Google Sheets
GOOGLE_SHEETS_ID=your_sheet_id_here
GOOGLE_SHEETS_RANGE=ALL_SHEETS

# Google Credentials
GOOGLE_CREDENTIALS_PATH=./credentials.json
```

### 2. ตั้งค่า Google Cloud Console
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้างโปรเจคใหม่
3. เปิดใช้งาน Google Docs API และ Google Sheets API
4. สร้าง Service Account
5. ดาวน์โหลดไฟล์ credentials.json

### 3. ตั้งค่าสิทธิ์การเข้าถึง
1. แชร์ Google Docs กับ Service Account email
2. แชร์ Google Sheets กับ Service Account email
3. ตั้งค่าสิทธิ์เป็น "Viewer" หรือ "Editor"

## 🧪 การทดสอบ

### 1. ทดสอบการโหลดข้อมูล
```bash
npm start
```

ตรวจสอบในเทอร์มินอล:
```
📄 Bot personality loaded from Google Docs
📊 Bot Configuration Summary:
================================
🤖 Bot Name: [ชื่อบอท]
🎭 Personality: [บุคลิกภาพ]
👤 Identity: [ตัวตน]
🏢 Business Info: [ข้อมูลธุรกิจ]
💬 Default Response: [คำตอบเริ่มต้น]
🌐 Language: ไทย
🎵 Tone: เป็นมิตร
================================
```

### 2. ทดสอบการโหลดคีย์เวิร์ด
```
📊 Available sheets: [ชื่อชีท]
📊 Loaded keywords from sheet: [ชื่อชีท]: [จำนวน] keywords
📊 Total loaded keywords from Google Sheets: [จำนวน] keywords
```

### 3. ทดสอบการตอบคำถาม
1. ส่งข้อความทดสอบ
2. ตรวจสอบว่าตอบถูกต้อง
3. ตรวจสอบว่าข้อมูลถูกดึงมาจากแหล่งที่ถูกต้อง

## ⚠️ ข้อควรระวัง

### 1. การใช้รูปแบบที่ถูกต้อง
- ใช้ `**ชื่อ:**` และ `**ข้อมูล:**` ตามรูปแบบที่กำหนด
- หลีกเลี่ยงการใช้เครื่องหมายพิเศษที่ไม่จำเป็น
- ใช้ภาษาไทยที่ถูกต้องและชัดเจน

### 2. การจัดการข้อมูล
- ข้อมูลไม่ควรยาวเกินไป
- หลีกเลี่ยงการใช้คีย์เวิร์ดที่ซ้ำกัน
- ตรวจสอบข้อมูลให้ถูกต้องก่อนใช้งาน

### 3. การตั้งค่าสิทธิ์
- ตรวจสอบว่า Service Account มีสิทธิ์เข้าถึงไฟล์
- ตรวจสอบว่าไฟล์ credentials.json ถูกต้อง
- ตรวจสอบว่า Environment Variables ถูกต้อง

## 🔄 การอัพเดทข้อมูล

### 1. การอัพเดท Google Docs
- แก้ไขข้อมูลใน Google Docs
- ระบบจะอัพเดทอัตโนมัติทุก 1 นาที
- หรือใช้ API endpoint `/api/refresh` เพื่ออัพเดททันที

### 2. การอัพเดท Google Sheets
- แก้ไขข้อมูลใน Google Sheets
- ระบบจะอัพเดทอัตโนมัติทุก 1 นาที
- หรือใช้ API endpoint `/api/refresh` เพื่ออัพเดททันที

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัย:
1. ตรวจสอบไฟล์ log ในเทอร์มินอล
2. ตรวจสอบการตั้งค่า Environment Variables
3. ตรวจสอบสิทธิ์การเข้าถึงไฟล์
4. ติดต่อทีมพัฒนา

## 📚 ไฟล์อ้างอิง

- `templates/google-docs-template.md` - เทมเพลต Google Docs
- `templates/google-sheets-template.md` - เทมเพลต Google Sheets
- `sample-google-docs-content.txt` - ตัวอย่างเนื้อหา Google Docs
- `sample-google-sheets-content.csv` - ตัวอย่างเนื้อหา Google Sheets
