# 📖 Quran Video Studio Pro — استوديو فيديوهات القرآن الذكي

استوديو ويب احترافي وشامل لإنتاج وتصميم فيديوهات القرآن الكريم (ريلز، تيك توك، شورتس، ويوتيوب) مدعوم بالذكاء الاصطناعي السريع وتقنية المحاذاة التجويدية الصوتية الدقيقة.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLounes-213%2FV-&env=GEMINI_API_KEY,GEMINI_MODEL&envDescription=Google%20AI%20Studio%20Gemini%20API%20Key&envLink=https%3A%2F%2Faistudio.google.com%2Fapp%2Fapikey)

---

## ✨ المميزات الرئيسية (Features)

1. **التعرف الصوتي فائق السرعة (Flash Recognition)**:
   - مدعوم بمحرك `gemini-3.5-flash-lite` مع استجابة فورية (~900ms) ودقة متناهية في كشف السورة والآيات المتتالية دون أي اقتطاع.
2. **محرك المحاذاة التجويدية الصوتية (Tajweed Forced Alignment)**:
   - حساب دقيق لأزمنة المدود بالحركات (المد اللازم 6 حركات، المد المتصل والمنفصل 4-5 حركات، المد العارض للسكون 4 حركات، الغنن والمد الطبيعي حركتان).
   - رصد السكتات والوقف بين الآيات والكلمات (Silence & Waqf Detection).
   - التقاط نبرات الطاقة الصوتية (RMS Onsets) لمحاذاة بداية نطق كل كلمة بدقة الميلي ثانية.
3. **توقيتات القراء الرسمية الذهبية (Quran.com Golden Segments)**:
   - ربط مباشر مع قاعدة بيانات المحاذاة الإجبارية الرسمية لـ Quran.com لجميع كبار القراء (مشاري العفاسي، عبد الباسط عبد الصمد، محمود خليل الحصري، سعد الغامدي، أبو بكر الشاطري، وغيرهم).
4. **محرر فيديو احترافي على المتصفح والهاتف**:
   - قوالب متعددة الأبعاد: ريلز وتيك توك (9:16)، إنستغرام مربع (1:1)، ويوتيوب (16:9).
   - تحكم كامل بالخطوط العثمانية، ألوان التوهج، الخلفيات الحية، وتأثيرات ظهور الكلمات كلمة بكلمة.
   - تصدير فيديو مباشر بدقة عالية دون الحاجة لأي برامج مونتاج خارجية.

---

## 🚀 التشغيل السريع (Quick Start)

### 1. المتطلبات:
- [Node.js](https://nodejs.org) (v18 أو أحدث)
- مفتاح [Google AI Studio Gemini API Key](https://aistudio.google.com/app/apikey)

### 2. التثبيت والتشغيل:
```bash
# استنساخ المشروع
git clone https://github.com/Lounes-213/V-.git
cd V-

# تثبيت الحزم
npm install

# إعداد المتغيرات البيئية
cp .env.example .env.local
# ضع مفتاح GEMINI_API_KEY في ملف .env.local

# التشغيل للتطوير
npm run dev

# أو البناء والتشغيل للإنتاج
npm run build
npm run start
```

افتح المتصفح على:
- الاستوديو باللغة العربية: `http://localhost:3000/ar/quran-video`
- الاستوديو باللغة الإنجليزية: `http://localhost:3000/en/quran-video`
- الاستوديو باللغة الفرنسية: `http://localhost:3000/fr/quran-video`

---

## 📱 التشغيل على الهاتف المحمول (Mobile Phone)

إذا كان الكمبيوتر والهاتف متصلين بنفس شبكة الـ Wi-Fi المنزلية:
افتح متصفح الهاتف على:
```
http://<local-ip>:3000/ar/quran-video
```
(مثال: `http://192.168.1.72:3000/ar/quran-video`)

---

## ☁️ النشر المباشر على Vercel (Deploy)

اضغط على الزر أدناه لنشر المشروع مجاناً بضغطة زر واحدة:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLounes-213%2FV-&env=GEMINI_API_KEY,GEMINI_MODEL&envDescription=Google%20AI%20Studio%20Gemini%20API%20Key&envLink=https%3A%2F%2Faistudio.google.com%2Fapp%2Fapikey)

**المتغيرات المطلوبة في Vercel:**
- `GEMINI_API_KEY`: مفتاح Gemini الخاص بك.
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`

---

## 🧪 فحص الجودة والاختبارات

```bash
# تشغيل جميع الاختبارات (230 اختباراً)
npm run test

# فحص الأنماط البرمجية TypeScript
npm run typecheck
```

---

## 📄 الترخيص (License)
هذا المشروع متاح للاستخدام الخيري والتعليمي والتطوير المفتوح.
