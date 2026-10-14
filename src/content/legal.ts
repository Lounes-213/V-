/**
 * Legal copy.
 *
 * Written as real documents rather than placeholders, and kept next to the code
 * so a change in behaviour (a new sub-processor, a new AI route) is a visible
 * diff here. Every claim below is true of this codebase as it stands: the app
 * stores media in OPFS, sends audio to Gemini only with consent, and never
 * writes a user's media to a server.
 */

export type LegalSlug =
  | "privacy"
  | "terms"
  | "dmca"
  | "ai-disclosure"
  | "reciter-rights"
  | "cookies";

export type LegalSection = { heading: string; body: string[] };
export type LegalDocument = { title: string; summary: string; updated: string; sections: LegalSection[] };

export const LEGAL_SLUGS: LegalSlug[] = [
  "privacy",
  "terms",
  "dmca",
  "ai-disclosure",
  "reciter-rights",
  "cookies",
];

const UPDATED = "2026-10-10";

const en: Record<LegalSlug, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    summary:
      "Your video never leaves your device. This page explains exactly what is stored, where, and the one case where audio can leave the browser — with your explicit consent.",
    updated: UPDATED,
    sections: [
      {
        heading: "What stays on your device",
        body: [
          "Imported footage is written to the Origin Private File System (OPFS) inside your browser profile. Project metadata, transcripts, captions, preferences and usage counters live in IndexedDB. Neither is uploaded anywhere by the editor.",
          "There is no media upload endpoint in this application. The only route that accepts bytes is /api/ai/transcribe, and it refuses every request that does not carry an explicit consent flag from you.",
        ],
      },
      {
        heading: "The one way audio can leave your browser",
        body: [
          "If you switch on server-side transcription, the audio file is sent to Google Gemini to produce a transcript. It is processed for that request and discarded; it is not written to our storage, and it is not used to train models by us.",
          "That switch is off by default, it is per import, and turning it on is the only action that sends your media off the device.",
        ],
      },
      {
        heading: "Transcript text and AI features",
        body: [
          "Clip ranking sends transcript text only — never audio, never video, never a file reference. Text is sent with your consent to the same provider and is cached by file content hash to avoid repeat charges.",
        ],
      },
      {
        heading: "What we do not do",
        body: [
          "No advertising identifiers, no cross-site tracking, no fingerprinting, no third-party analytics that receive your footage or transcript.",
          "No account is required to edit. If accounts are enabled on a deployment, the only data stored server-side is metadata you already see in the app: project titles, durations, settings, usage and subscription state.",
        ],
      },
      {
        heading: "Your controls",
        body: [
          "Settings → Privacy exports everything as JSON, clears cached media, and shows how much storage you are using. Deleting a project removes its metadata and its media handle; clearing cache removes stored footage.",
          "Because the data lives in your browser, clearing site data for this origin is equivalent to a full deletion request — and it happens without asking us.",
        ],
      },
      {
        heading: "Children and jurisdiction",
        body: [
          "The service is not directed at children under 13. Data protection requests can be sent to the contact address published in the site footer; Algerian law (Law 18-07 on the protection of natural persons in the processing of personal data) applies to our own processing.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    summary:
      "Plain rules for using the studio: your footage stays yours, you are responsible for what you publish, and the tool is provided as-is.",
    updated: UPDATED,
    sections: [
      {
        heading: "Your content",
        body: [
          "You keep every right you had in the footage you import and in the captions, transcripts and exports you produce. We claim no licence over them: the media is in your browser and we cannot reach it.",
        ],
      },
      {
        heading: "Your responsibilities",
        body: [
          "Only import material you have the right to use. Do not use the studio to produce content that is unlawful, defamatory, or that infringes copyright, personality rights or the rights of reciters and rights-holders whose recordings you use.",
          "When you export, you are the publisher. Review machine-generated text before you publish it — especially Quranic text, which is governed by its own notice.",
        ],
      },
      {
        heading: "Acceptable use of AI features",
        body: [
          "AI features are metered per hour and per day. Do not attempt to bypass quotas, resell access, or submit material you do not have the right to send to a third-party provider.",
        ],
      },
      {
        heading: "Availability and warranty",
        body: [
          "The studio is provided on an as-is basis. Editing happens in your browser, so the reliability of your work depends on your device and on keeping a backup: exports are your copy.",
          "We are not liable for lost edits, failed exports, or content you publish. Where liability cannot be excluded, it is limited to the amount you paid in the twelve months before the claim — which, on the free plan, is zero.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "Material changes to these terms will be dated on this page. Continuing to use the studio after a change means you accept it; if you do not, stop using it and delete your local data.",
        ],
      },
    ],
  },
  dmca: {
    title: "Copyright and takedown policy",
    summary:
      "How to report infringing material, what happens next, and how to respond if something of yours was removed by mistake.",
    updated: UPDATED,
    sections: [
      {
        heading: "Where infringement can actually occur",
        body: [
          "Because footage is edited in the browser, this service hosts no user video. Infringement can only appear in two places we control: the bundled demo clip, and content published elsewhere using assets we shipped.",
        ],
      },
      {
        heading: "The bundled demo clip",
        body: [
          "The demo recording is a Wikitongues oral history (speaker: Fayçal, Algerian Arabic) distributed under CC BY-SA 4.0. Attribution and the share-alike terms are documented in public/demo/README.md, and the attribution is displayed in the app next to the demo project.",
          "If you believe even this use is unauthorised, send a notice and we will remove the file while we review it.",
        ],
      },
      {
        heading: "Filing a notice",
        body: [
          "Send an email to the contact address in the site footer with: identification of the work, the exact URL or file path of the material you say infringes it, your contact details, a statement of good-faith belief, a statement under penalty of perjury that the information is accurate and that you are authorised to act, and your physical or electronic signature.",
          "Incomplete notices cannot be acted on, because we need to know precisely what to remove.",
        ],
      },
      {
        heading: "What we do next",
        body: [
          "We acknowledge within 5 working days, remove or disable the identified material if the notice is valid, and tell the uploader what was removed and why so they can respond.",
        ],
      },
      {
        heading: "Counter-notice",
        body: [
          "If your material was removed and you believe it was lawful, send a counter-notice with the same elements plus your consent to the jurisdiction of a competent Algerian court. We may restore the material if the complainant does not pursue the matter.",
        ],
      },
      {
        heading: "Repeat infringement",
        body: [
          "Accounts or keys used repeatedly to infringe are terminated. That is the only sanction available to us over content we cannot see.",
        ],
      },
    ],
  },
  "ai-disclosure": {
    title: "AI data disclosure",
    summary:
      "Which features use AI, what data each one sends, which provider receives it, and what the output can and cannot be trusted for.",
    updated: UPDATED,
    sections: [
      {
        heading: "Which features use AI",
        body: [
          "Two, both optional: server-side transcription (audio → timed text) and clip ranking (transcript text → scores and reasons). Caption layout, cutting, waveform, sound detection and export run locally with no model at all.",
        ],
      },
      {
        heading: "What is sent, and when",
        body: [
          "Transcription sends the audio file, only after you switch on consent for that import. Clip ranking sends the transcript text of the candidate windows; it never receives audio or video.",
          "Both calls are made from our server, so the provider sees our server's request, not your browser. Neither is used to train models by us.",
        ],
      },
      {
        heading: "Provider and retention",
        body: [
          "The provider is Google (Gemini API), acting as a sub-processor. Requests are stateless: the response is used to build your timeline and the request payload is not retained by us. Ranking responses are cached locally by a hash of the transcript they were produced from.",
        ],
      },
      {
        heading: "Known limits you should assume",
        body: [
          "Machine transcription of dialectal Arabic is approximate. Word timings in particular can drift, and a transcript is a draft, not a record.",
          "Ranking scores are opinions produced by a model from text alone; they do not know what your footage shows. Treat them as suggestions with reasons attached, which is exactly how the interface presents them.",
        ],
      },
      {
        heading: "Quranic text is different",
        body: [
          "Verse text is never generated by a model. It is fetched from the Quran Foundation Content API and matched against your recitation; the match is scored, and anything below the high-confidence band is marked for human review and cannot be exported unnoticed.",
        ],
      },
      {
        heading: "Your opt-outs",
        body: [
          "Leave consent off and never call the ranking action: the studio then behaves entirely offline, with measured suggestions and local sound detection instead of model output.",
        ],
      },
    ],
  },
  "reciter-rights": {
    title: "Quran text, recitation and reciter rights",
    summary:
      "Where the sacred text comes from, why a human must approve low-confidence matches, and why a recitation's rights belong to its reciter and publisher.",
    updated: UPDATED,
    sections: [
      {
        heading: "The text",
        body: [
          "Verse text is taken unmodified from the Quran Foundation Content API v4 (Uthmani script) and cached in the repository. It is never typed by hand and never produced by a language model.",
          "Translations are shown with their publisher named — for example Montada Islamic Foundation for French — and are displayed alongside the Arabic, never instead of it.",
        ],
      },
      {
        heading: "Matching is checked, not assumed",
        body: [
          "Recitation detected in a transcript is scored against the canonical text. Matches in the high band may proceed; anything in the medium or low band is flagged, shown with its confidence, and blocks export until a human confirms or corrects it.",
          "Corrections are recorded, so the reason a verse appears in your export is auditable.",
        ],
      },
      {
        heading: "Recitations are not public property",
        body: [
          "A recording of a reciter is the reciter's performance and usually also the publisher's production. Using it in your video requires their permission, and often a licence — reciters and Quran publishers actively enforce this.",
          "This studio gives you measurement and captions; it does not grant you rights in anyone's recording. Obtain permission before publishing.",
        ],
      },
      {
        heading: "Our own demo material",
        body: [
          "The clip bundled for the demo is a Wikitongues oral history under CC BY-SA 4.0, with attribution displayed in the app and documented in public/demo/README.md. It is not a recitation and is not presented as one.",
        ],
      },
      {
        heading: "Respect in presentation",
        body: [
          "Do not use Quran Mode to produce mockery, misattribution or truncated verses that change meaning. If a verse is only partially captured, cut it out instead of publishing a fragment as if it were complete.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookies and local storage",
    summary:
      "There are no advertising cookies here. This table lists everything the app stores in your browser and what happens if you delete it.",
    updated: UPDATED,
    sections: [
      {
        heading: "Cookies",
        body: [
          "The studio sets no tracking or advertising cookies. A single first-party cookie may be used to remember your language choice; it contains a locale code and nothing else.",
        ],
      },
      {
        heading: "Local storage the app depends on",
        body: [
          "dz-prefs — theme, digits, default aspect and preset, Quran script and translation, motion and hardware preferences. Deleting it resets settings to defaults.",
          "dz-video-ai-studio (IndexedDB) — projects, transcripts, captions, suggestions, Quran matches, usage counters and small media blobs when OPFS is unavailable. Deleting it removes your edits.",
          "dz-media (OPFS) — your imported footage. Deleting it removes the media; projects remain but cannot play until you re-import.",
        ],
      },
      {
        heading: "Third parties",
        body: [
          "AI requests are made from our server, so no third-party script runs in your browser for them. There is no embedded analytics, tag manager, or social pixel on this site.",
        ],
      },
      {
        heading: "Your choices",
        body: [
          "Settings → Privacy exports all of the above as JSON and clears cached media. Your browser's site-data controls can remove everything at once.",
        ],
      },
    ],
  },
};

const ar: Record<LegalSlug, LegalDocument> = {
  privacy: {
    title: "سياسة الخصوصية",
    summary:
      "الفيديو تاعك ما يخرجش من الجهاز تاعك. هذي الصفحة تشرح بالضبط واش يتخزّن، وين، والحالة الوحيدة اللي يخرج فيها الصوت — بموافقتك الصريحة.",
    updated: UPDATED,
    sections: [
      {
        heading: "واش يبقى في جهازك",
        body: [
          "الملفات اللي تستوردها تتكتب في Origin Private File System داخل المتصفح تاعك. معلومات المشروع، النص، الترجمات، الإعدادات وعدّاد الاستعمال كلها في IndexedDB. حتى واحد فيهم ما يتصيفط.",
          "ما كانش أي مخدم لرفع الفيديو في هذا التطبيق. الطريق الوحيدة اللي تقبل البيانات هي /api/ai/transcribe، وهي ترفض كل طلب ما فيهش موافقة صريحة منك.",
        ],
      },
      {
        heading: "الحالة الوحيدة اللي يخرج فيها الصوت",
        body: [
          "إذا شغّلت التحويل من الصوت لنص في السيرفر، الملف الصوتي يتصيفط لـ Google Gemini باش يطلع النص. يتعالج على قد الطلب ويتحذف؛ ما يتخزّنش عندنا وما يتستعملش لتدريب الموديلات.",
          "هذا الخيار مطفي افتراضيا، ويخص كل استيراد على حدة، وتشغيله هو الشي الوحيد اللي يخرّج الميديا من الجهاز.",
        ],
      },
      {
        heading: "النص وميزات الذكاء الاصطناعي",
        body: [
          "ترتيب المقترحات يتصيفط نص فقط — عمره ما يتصيفط صوت ولا فيديو ولا اسم ملف. النص يتصيفط بموافقتك، ويتخزّن محليا بمفتاح من محتواه باش ما يتكرّرش الطلب.",
        ],
      },
      {
        heading: "واش ما نديروهش",
        body: [
          "ما كانش معرّفات إشهار، ولا تتبع بين المواقع، ولا بصمة متصفح، ولا تحليلات طرف ثالث توصلها الميديا ولا النص تاعك.",
          "التصحيح ما يحتاجش حساب. إذا تفعّلت الحسابات في نشر معيّن، البيانات الوحيدة اللي تتخزّن في السيرفر هي معلومات تشوفها في التطبيق: عنوان المشروع، المدة، الإعدادات، الاستعمال وحالة الاشتراك.",
        ],
      },
      {
        heading: "تحكّمك",
        body: [
          "الإعدادات ← الخصوصية: تصدير كل شيء بصيغة JSON، تفريغ الميديا المخزنة، وعرض حجم الاستعمال. حذف مشروع يمحي معلوماته؛ تفريغ الكاش يمحي الفيديو المخزّن.",
          "بما أن البيانات في متصفحك، تفريغ بيانات الموقع يعادل طلب حذف كامل — ويصير بلا ما تسقسي حتى واحد.",
        ],
      },
      {
        heading: "الأطفال والاختصاص القضائي",
        body: [
          "الخدمة ما موجّهاش للأطفال أقل من 13 سنة. طلبات حماية المعطيات تتوجّه للعنوان المنشور في تذييل الموقع، والقانون الجزائري 18-07 على حماية الأشخاص الطبيعيين في معالجة المعطيات ذات الطابع الشخصي يطبّق على معالجتنا.",
        ],
      },
    ],
  },
  terms: {
    title: "شروط الاستعمال",
    summary: "قواعد بسيطة: المادة تاعك تبقى تاعك، وأنت مسؤول على واش تنشر، والأداة تُقدَّم كما هي.",
    updated: UPDATED,
    sections: [
      {
        heading: "المحتوى تاعك",
        body: [
          "تحتفظ بكل الحقوق في المادة اللي تستوردها وفي النصوص والترجمات والتصديرات اللي تنتجها. ما نطلبوش أي رخصة عليها: الميديا في متصفحك وما نقدرش نوصلوها.",
        ],
      },
      {
        heading: "مسؤولياتك",
        body: [
          "استورد غير المادة اللي عندك حق فيها. ما تستعملش الاستوديو باش تنتج محتوى غير قانوني أو قذف، أو ينتهك حقوق المؤلف أو الحقوق المعنوية أو حقوق القرّاء وأصحاب التسجيلات.",
          "كي تصدّر، أنت الناشر. راجع النص المولَّد قبل ما تنشر — بالخصوص النص القرآني اللي عندو إشعار خاص بيه.",
        ],
      },
      {
        heading: "الاستعمال المقبول لميزات الذكاء الاصطناعي",
        body: [
          "الميزات محسوبة لكل ساعة ولكل يوم. ما تحاولش تتجاوز الحدود، ولا تبيع الوصول، ولا تصيفط مادة ما عندكش حق تصيفطها لطرف ثالث.",
        ],
      },
      {
        heading: "التوفّر والضمان",
        body: [
          "الاستوديو يتقدّم كما هو. التحرير يصير في متصفحك، فموثوقية خدمتك تتعلّق بجهازك وبحفظك لنسخة: التصدير هو النسخة تاعك.",
          "ما نتحمّلوش مسؤولية تعديلات ضايعة أو تصدير طايح أو محتوى تنشره. إذا كانت المسؤولية ما تتنحّاش، تتحصر في المبلغ المدفوع في 12 شهر قبل المطالبة — وفي الخطة المجانية هذا صفر.",
        ],
      },
      {
        heading: "التغييرات",
        body: [
          "التغييرات الجوهرية تتأرّخ في هذي الصفحة. الاستمرار في الاستعمال بعد التغيير يعني القبول؛ وإذا ما قبلتش، حبّس الاستعمال وامحي البيانات المحلية.",
        ],
      },
    ],
  },
  dmca: {
    title: "حقوق المؤلف وسياسة الإزالة",
    summary: "كيفاش تبلّغ على محتوى ينتهك الحقوق، واش يصير من بعد، وكيفاش تردّ إذا تحيّد حاجة تاعك بالغلط.",
    updated: UPDATED,
    sections: [
      {
        heading: "وين يقدر يصير الانتهاك",
        body: [
          "بما أن التحرير في المتصفح، الخدمة ما تستضيفش فيديو المستخدمين. الانتهاك يقدر يبان غير في زوج مواضع نتحكّموا فيهم: المقطع التجريبي المرفق، والمحتوى اللي ينشر في مكان آخر بمادة وفّرناها.",
        ],
      },
      {
        heading: "المقطع التجريبي",
        body: [
          "التسجيل التجريبي هو حكاية شفوية من Wikitongues (المتحدث: فيصل، دارجة جزائرية) بترخيص CC BY-SA 4.0. النسبة والترخيص مذكورين في public/demo/README.md، والنسبة تبان في التطبيق حدا المشروع التجريبي.",
          "إذا كنت تشوف حتى هذي المادة غير مرخّصة، صيفط إشعار ونحيّدو الملف في وقت المراجعة.",
        ],
      },
      {
        heading: "تقديم الإشعار",
        body: [
          "صيفط بريد للعنوان المنشور في تذييل الموقع فيه: تحديد العمل، الرابط الدقيق أو مسار الملف المتنازع عليه، معلومات الاتصال تاعك، تصريح بحسن النية، تصريح تحت القسم بأن المعلومات صحيحة وأنك مرخّص، وتوقيعك.",
          "الإشعارات الناقصة ما تتعرّضش لأننا نحتاجو نعرفو بالضبط واش نحيّدو.",
        ],
      },
      {
        heading: "واش نديرو من بعد",
        body: [
          "نأكدّو الاستلام في 5 أيام عمل، ونحيّدو المادة المحدّدة إذا كان الإشعار صحيح، ونبلّغو اللي رفعها واش تحيّد وعلاش باش يقدر يردّ.",
        ],
      },
      {
        heading: "الإشعار المضاد",
        body: [
          "إذا تحيّدت مادة تاعك وتشوف أنها قانونية، صيفط إشعار مضاد بنفس العناصر زائد موافقتك على اختصاص محكمة جزائرية مختصة. نقدر نرجّعو المادة إذا المشتكي ما تابعش القضية.",
        ],
      },
      {
        heading: "الانتهاك المتكرر",
        body: [
          "الحسابات أو المفاتيح اللي تتستعمل بشكل متكرر في الانتهاك تتوقف. هذا هو الجزاء الوحيد المتاح علينا تجاه محتوى ما نشوفوهش.",
        ],
      },
    ],
  },
  "ai-disclosure": {
    title: "إفصاح معطيات الذكاء الاصطناعي",
    summary: "أي ميزات تستعمل الذكاء الاصطناعي، واش تصيفط كل وحدة، أي مزوّد يستقبلها، وعلى واش يصلح الناتج وواش ما يصلحش.",
    updated: UPDATED,
    sections: [
      {
        heading: "أي ميزات تستعمل الذكاء الاصطناعي",
        body: [
          "زوج، والزوج اختياريين: التحويل من الصوت لنص في السيرفر (صوت ← نص مؤقت)، وترتيب المقترحات (نص ← نقاط وأسباب). تخطيط الترجمات، القص، الموجة الصوتية، كشف الصوت والتصدير كلها محليين بلا أي موديل.",
        ],
      },
      {
        heading: "واش يتصيفط، ووقتاش",
        body: [
          "التحويل يصيفط الملف الصوتي، غير من بعد ما تشغّل الموافقة في ذلك الاستيراد. الترتيب يصيفط نص المقترحات؛ عمره ما يستقبل صوت ولا فيديو.",
          "الطلبات تصير من السيرفر تاعنا، والمزوّد يشوف طلب السيرفر، ما يشوفش المتصفح تاعك. وما كاينش تدريب للموديلات بمادة تاعك من طرفنا.",
        ],
      },
      {
        heading: "المزوّد والحفظ",
        body: [
          "المزوّد هو Google (Gemini API) بصفته معالجا فرعيا. الطلبات بلا حالة: الرد يتستعمل في بناء المسار الزمني، والبيانات ما نحفظوهاش. ردود الترتيب تتخزّن محليا بمفتاح من النص اللي ولّدها.",
        ],
      },
      {
        heading: "حدود معروفة لازم تفترضها",
        body: [
          "تحويل الدارجة آليا تقريبي. توقيت الكلمات بالخصوص يقدر يزول، والنص مشروع، ماشي سجل رسمي.",
          "نقاط الترتيب آراء موديل من النص وحده؛ ما يعرفش واش يبان في الفيديو. تعامل معاها كاقتراحات مع أسبابها، وهذا بالضبط كيفاش يعرضها التطبيق.",
        ],
      },
      {
        heading: "النص القرآني مختلف",
        body: [
          "النص القرآني عمره ما يتولّد بموديل. يتجاب من Quran Foundation Content API ويتطابق مع التلاوة تاعك؛ التطابق يتنقّط، وكل ما هو تحت النطاق العالي يتعلّم للمراجعة البشرية وما يتصدّرش بلا ما يلاحظو.",
        ],
      },
      {
        heading: "كيفاش تمنع",
        body: [
          "خلّي الموافقة مطفية وما تستعملش زر الترتيب: الاستوديو يرجع يخدم أوفلاين بالكامل، باقتراحات محسوبة وكشف صوت محلي بلا موديل.",
        ],
      },
    ],
  },
  "reciter-rights": {
    title: "النص القرآني والتلاوة وحقوق القرّاء",
    summary: "منين يجي النص، علاش لازم إنسان يوافق على المطابقات الضعيفة، وعلاش حقوق التسجيل ترجع للقاري والناشر.",
    updated: UPDATED,
    sections: [
      {
        heading: "النص",
        body: [
          "النص يجي بلا تحريف من Quran Foundation Content API v4 (رسم عثماني) ويتخزّن في المستودع. عمره ما يتكتب بيد ولا يتولّد بموديل لغوي.",
          "الترجمات تتعرض باسم ناشرها — مثلا Montada Islamic Foundation للفرنسية — وتعرض حدا العربية، ماشي بدلها.",
        ],
      },
      {
        heading: "المطابقة تتراجع، ما تتفترضش",
        body: [
          "التلاوة اللي تكتشف في النص تتنقّط مقابل النص المرجعي. المطابقات العالية تقدر تمشي؛ اللي في النطاق المتوسط أو الضعيف تتعلم، تتعرض بنقاطها، وتحبس التصدير حتى يوافق إنسان أو يصحّح.",
          "التصحيحات تتسجل، فسبب وجود الآية في التصدير تاعك يكون قابل للمراجعة.",
        ],
      },
      {
        heading: "التسجيلات ماشي ملك عام",
        body: [
          "تسجيل القاري هو أداء تاعو، وغالبا إنتاج تاع الناشر زادة. استعمالو في الفيديو تاعك يحتاج إذنهم، وبزاف من المرات رخصة — والقرّاء وناشرو المصاحف يتابعو هذا بجدية.",
          "الاستوديو يعطيك القياس والترجمات؛ ما يعطيكش حقوق في تسجيل حتى واحد. طلب الإذن قبل النشر.",
        ],
      },
      {
        heading: "المادة التجريبية تاعنا",
        body: [
          "المقطع المرفق للتجربة هو حكاية شفوية من Wikitongues بترخيص CC BY-SA 4.0، مع نسبة تبان في التطبيق وموثّقة في public/demo/README.md. ماشي تلاوة وما يتعرضش كتلاوة.",
        ],
      },
      {
        heading: "الاحترام في العرض",
        body: [
          "ما تستعملش وضع القرآن باش تنتج سخرية أو نسبة غالطة أو آيات مقطوعة تبدّل المعنى. إذا الآية ملتقطة جزئيا، حيّدها بدل ما تنشر قطعة وكأنها كاملة.",
        ],
      },
    ],
  },
  cookies: {
    title: "الكوكيز والتخزين المحلي",
    summary: "ما كانش كوكيز إشهار هنا. هذا الجدول فيه كل شي يخزّنه التطبيق في متصفحك وواش يصير إذا حيّدتو.",
    updated: UPDATED,
    sections: [
      {
        heading: "الكوكيز",
        body: [
          "الاستوديو ما يحطش كوكيز تتبع ولا إشهار. يمكن كوكي واحد من نفس الموقع باش يتفكّر اختيار اللغة؛ فيه رمز اللغة وخلاص.",
        ],
      },
      {
        heading: "التخزين المحلي اللي يعتمد عليه التطبيق",
        body: [
          "dz-prefs — الثيم، الأرقام، الأبعاد والستايل الافتراضي، رسم القرآن وترجمتو، الحركة والتسريع. حذفو يرجّع الإعدادات للأصل.",
          "dz-video-ai-studio (IndexedDB) — المشاريع، النصوص، الترجمات، المقترحات، مطابقات القرآن، عدّادات الاستعمال وقطع صغيرة من الميديا إذا OPFS ما كانش متوفر. حذفو يمحي تعديلاتك.",
          "dz-media (OPFS) — المادة اللي استوردتها. حذفو يمحي الميديا؛ المشاريع تبقى بصح ما تشتغلش حتى تعاود الاستيراد.",
        ],
      },
      {
        heading: "الأطراف الثالثة",
        body: [
          "طلبات الذكاء الاصطناعي تصير من السيرفر تاعنا، فما كاينش سكريبت طرف ثالث يخدم في متصفحك من أجلها. ما كانش تحليلات مدمجة ولا مدير وسوم ولا بكسل اجتماعي في هذا الموقع.",
        ],
      },
      {
        heading: "اختياراتك",
        body: [
          "الإعدادات ← الخصوصية: تصدير كل ما سبق بصيغة JSON وتفريغ الميديا المخزنة. أدوات بيانات الموقع في المتصفح تقدر تحيّد كل شيء مرة وحدة.",
        ],
      },
    ],
  },
};

const fr: Record<LegalSlug, LegalDocument> = {
  privacy: {
    title: "Politique de confidentialité",
    summary:
      "Votre vidéo ne quitte jamais votre appareil. Cette page détaille ce qui est stocké, où, et le seul cas où l'audio peut sortir du navigateur — avec votre consentement explicite.",
    updated: UPDATED,
    sections: [
      {
        heading: "Ce qui reste sur votre appareil",
        body: [
          "Les rushes importés sont écrits dans l'Origin Private File System (OPFS) de votre profil de navigateur. Les métadonnées de projet, transcriptions, sous-titres, préférences et compteurs d'usage vivent dans IndexedDB. Rien de tout cela n'est téléversé.",
          "L'application ne contient aucun point d'entrée d'upload de média. La seule route qui accepte des octets est /api/ai/transcribe, et elle refuse toute requête sans votre consentement explicite.",
        ],
      },
      {
        heading: "Le seul cas où l'audio peut sortir",
        body: [
          "Si vous activez la transcription côté serveur, le fichier audio est envoyé à Google Gemini pour produire la transcription. Il est traité pour cette requête puis écarté ; il n'est pas conservé chez nous ni utilisé pour entraîner des modèles.",
          "Ce réglage est désactivé par défaut, il vaut pour un import donné, et l'activer est la seule action qui fait sortir votre média de l'appareil.",
        ],
      },
      {
        heading: "Texte et fonctions IA",
        body: [
          "Le classement des extraits n'envoie que du texte — jamais d'audio, jamais de vidéo, jamais de référence de fichier. Le texte est envoyé avec votre accord et mis en cache par empreinte de contenu pour éviter les appels répétés.",
        ],
      },
      {
        heading: "Ce que nous ne faisons pas",
        body: [
          "Aucun identifiant publicitaire, aucun suivi inter-sites, aucune empreinte de navigateur, aucune analytique tierce qui recevrait vos rushes ou votre transcription.",
          "Aucun compte n'est nécessaire pour éditer. Si des comptes sont activés sur un déploiement, seules des métadonnées visibles dans l'application sont stockées côté serveur.",
        ],
      },
      {
        heading: "Vos contrôles",
        body: [
          "Réglages → Confidentialité exporte tout en JSON, vide le média en cache et affiche l'espace utilisé. Supprimer un projet efface ses métadonnées ; vider le cache efface les rushes stockés.",
          "Les données vivant dans votre navigateur, effacer les données du site équivaut à une demande de suppression complète — sans passer par nous.",
        ],
      },
      {
        heading: "Enfants et droit applicable",
        body: [
          "Le service ne s'adresse pas aux enfants de moins de 13 ans. Les demandes relatives aux données peuvent être adressées au contact publié en pied de page ; la loi algérienne 18-07 relative à la protection des personnes physiques dans le traitement des données à caractère personnel s'applique à nos propres traitements.",
        ],
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    summary:
      "Des règles simples : vos rushes restent les vôtres, vous êtes responsable de ce que vous publiez, et l'outil est fourni tel quel.",
    updated: UPDATED,
    sections: [
      {
        heading: "Votre contenu",
        body: [
          "Vous conservez tous vos droits sur les rushes importés et sur les transcriptions, sous-titres et exports produits. Nous ne revendiquons aucune licence : le média est dans votre navigateur et nous ne pouvons pas y accéder.",
        ],
      },
      {
        heading: "Vos responsabilités",
        body: [
          "N'importez que des contenus que vous avez le droit d'utiliser. N'utilisez pas le studio pour produire des contenus illicites, diffamatoires, ou qui violent le droit d'auteur, les droits de la personnalité ou les droits des récitateurs et des ayants droit.",
          "À l'export, c'est vous l'éditeur. Relisez le texte généré automatiquement avant publication — en particulier le texte coranique, qui relève d'un avis spécifique.",
        ],
      },
      {
        heading: "Usage acceptable des fonctions IA",
        body: [
          "Les fonctions IA sont limitées par heure et par jour. Ne contournez pas les quotas, ne revendez pas l'accès, et n'envoyez pas de contenus que vous n'avez pas le droit de transmettre à un prestataire tiers.",
        ],
      },
      {
        heading: "Disponibilité et garantie",
        body: [
          "Le studio est fourni en l'état. L'édition se fait dans votre navigateur : la fiabilité de votre travail dépend de votre appareil, et l'export est votre sauvegarde.",
          "Nous ne sommes pas responsables des montages perdus, des exports échoués ou des contenus publiés. Lorsque la responsabilité ne peut être exclue, elle est limitée aux sommes payées dans les douze mois précédant la réclamation — soit zéro en formule gratuite.",
        ],
      },
      {
        heading: "Modifications",
        body: [
          "Toute modification substantielle sera datée sur cette page. Continuer à utiliser le studio après une modification vaut acceptation.",
        ],
      },
    ],
  },
  dmca: {
    title: "Droit d'auteur et retrait de contenu",
    summary:
      "Comment signaler un contenu litigieux, ce qui se passe ensuite, et comment répondre si votre contenu a été retiré par erreur.",
    updated: UPDATED,
    sections: [
      {
        heading: "Où une infraction est réellement possible",
        body: [
          "L'édition se faisant dans le navigateur, le service n'héberge aucune vidéo d'utilisateur. Une infraction ne peut apparaître qu'à deux endroits que nous contrôlons : le clip de démonstration fourni, et un contenu publié ailleurs à partir d'un élément que nous livrons.",
        ],
      },
      {
        heading: "Le clip de démonstration",
        body: [
          "L'enregistrement de démonstration est une histoire orale Wikitongues (locuteur : Fayçal, arabe algérien) diffusée sous CC BY-SA 4.0. L'attribution et le partage à l'identique sont documentés dans public/demo/README.md, et l'attribution est affichée dans l'application.",
          "Si vous estimez même cet usage non autorisé, adressez-nous une notification : nous retirerons le fichier le temps de l'examen.",
        ],
      },
      {
        heading: "Déposer une notification",
        body: [
          "Écrivez au contact indiqué en pied de page avec : l'identification de l'œuvre, l'URL ou le chemin exact du contenu en cause, vos coordonnées, une déclaration de bonne foi, une déclaration sous peine de parjure que les informations sont exactes et que vous êtes habilité, et votre signature.",
          "Une notification incomplète ne peut pas être traitée, car nous devons savoir précisément quoi retirer.",
        ],
      },
      {
        heading: "Notre suite d'action",
        body: [
          "Nous accusons réception sous 5 jours ouvrés, retirons le contenu identifié si la notification est valide, et informons la personne concernée de ce qui a été retiré et pourquoi.",
        ],
      },
      {
        heading: "Contre-notification",
        body: [
          "Si votre contenu a été retiré et que vous l'estimez licite, envoyez une contre-notification avec les mêmes éléments et votre acceptation de la compétence d'une juridiction algérienne. Le contenu peut être rétabli si le plaignant ne poursuit pas.",
        ],
      },
      {
        heading: "Récidive",
        body: [
          "Les comptes ou clés utilisés de façon répétée pour porter atteinte aux droits sont résiliés. C'est la seule sanction disponible sur un contenu que nous ne voyons pas.",
        ],
      },
    ],
  },
  "ai-disclosure": {
    title: "Divulgation des données IA",
    summary:
      "Quelles fonctions utilisent l'IA, quelles données chacune envoie, quel prestataire les reçoit, et ce qu'on peut attendre du résultat.",
    updated: UPDATED,
    sections: [
      {
        heading: "Fonctions concernées",
        body: [
          "Deux, toutes deux optionnelles : la transcription côté serveur (audio → texte horodaté) et le classement des extraits (texte → scores et raisons). Mise en page des sous-titres, découpe, forme d'onde, détection sonore et export tournent en local, sans modèle.",
        ],
      },
      {
        heading: "Ce qui est envoyé, et quand",
        body: [
          "La transcription envoie le fichier audio, uniquement après activation du consentement pour cet import. Le classement envoie le texte des extraits candidats ; il ne reçoit jamais d'audio ni de vidéo.",
          "Les appels partent de notre serveur : le prestataire voit la requête serveur, pas votre navigateur. Aucune de ces données ne sert à entraîner des modèles de notre fait.",
        ],
      },
      {
        heading: "Prestataire et conservation",
        body: [
          "Le prestataire est Google (API Gemini), en qualité de sous-traitant. Les requêtes sont sans état : la réponse sert à construire votre montage et la charge utile n'est pas conservée. Les réponses de classement sont mises en cache localement par empreinte du texte source.",
        ],
      },
      {
        heading: "Limites connues",
        body: [
          "La transcription automatique de l'arabe dialectal est approximative : les horodatages mot à mot peuvent dériver, et une transcription reste un brouillon.",
          "Les scores de classement sont l'avis d'un modèle sur du texte seul ; il ne sait pas ce que montre votre vidéo. Ce sont des suggestions motivées, et l'interface les présente comme telles.",
        ],
      },
      {
        heading: "Le texte coranique diffère",
        body: [
          "Le texte des versets n'est jamais généré par un modèle. Il provient de l'API Quran Foundation et est apparié à votre récitation ; l'appariement est noté, et tout ce qui est sous la bande haute est signalé pour relecture humaine.",
        ],
      },
      {
        heading: "Vos opt-out",
        body: [
          "Laissez le consentement désactivé et n'utilisez pas le bouton de classement : le studio fonctionne alors entièrement hors ligne, avec des suggestions mesurées et une détection sonore locale.",
        ],
      },
    ],
  },
  "reciter-rights": {
    title: "Texte coranique, récitation et droits des récitateurs",
    summary:
      "D'où vient le texte, pourquoi un humain doit approuver les appariements faibles, et pourquoi les droits d'un enregistrement appartiennent au récitateur et à l'éditeur.",
    updated: UPDATED,
    sections: [
      {
        heading: "Le texte",
        body: [
          "Le texte des versets provient sans modification de l'API Quran Foundation v4 (écriture uthmani) et est mis en cache dans le dépôt. Il n'est jamais saisi à la main ni produit par un modèle de langage.",
          "Les traductions sont affichées avec le nom de leur éditeur — par exemple Montada Islamic Foundation pour le français — à côté de l'arabe, jamais à sa place.",
        ],
      },
      {
        heading: "Un appariement vérifié, pas supposé",
        body: [
          "La récitation détectée est comparée au texte canonique et notée. La bande haute peut passer ; la bande moyenne ou basse est signalée, affichée avec sa confiance, et bloque l'export jusqu'à confirmation ou correction humaine.",
          "Les corrections sont consignées : la raison de la présence d'un verset dans votre export est auditable.",
        ],
      },
      {
        heading: "Une récitation n'est pas un bien commun",
        body: [
          "L'enregistrement d'un récitateur est son interprétation et, souvent, une production de son éditeur. L'utiliser dans votre vidéo exige leur autorisation, et souvent une licence — les récitateurs et les éditeurs y veillent activement.",
          "Le studio vous donne la mesure et les sous-titres ; il ne vous donne aucun droit sur l'enregistrement d'autrui.",
        ],
      },
      {
        heading: "Notre propre matériel de démonstration",
        body: [
          "Le clip fourni est une histoire orale Wikitongues sous CC BY-SA 4.0, attribuée dans l'application et documentée dans public/demo/README.md. Ce n'est pas une récitation et il n'est pas présenté comme telle.",
        ],
      },
      {
        heading: "Respect de la présentation",
        body: [
          "N'utilisez pas le mode Coran pour produire moquerie, attribution erronée ou versets tronqués qui changent le sens. Si un verset n'est que partiellement capté, retirez-le plutôt que de publier un fragment comme s'il était complet.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookies et stockage local",
    summary:
      "Aucun cookie publicitaire ici. Ce tableau liste tout ce que l'application stocke dans votre navigateur et ce qui se passe si vous l'effacez.",
    updated: UPDATED,
    sections: [
      {
        heading: "Cookies",
        body: [
          "Le studio ne pose aucun cookie de suivi ou publicitaire. Un unique cookie first-party peut mémoriser votre choix de langue : il contient un code de locale, rien d'autre.",
        ],
      },
      {
        heading: "Stockage local indispensable",
        body: [
          "dz-prefs — thème, chiffres, format et style par défaut, écriture et traduction du Coran, mouvement et accélération. L'effacer réinitialise les réglages.",
          "dz-video-ai-studio (IndexedDB) — projets, transcriptions, sous-titres, suggestions, appariements coraniques, compteurs d'usage et petits blobs si OPFS est indisponible. L'effacer supprime vos montages.",
          "dz-media (OPFS) — vos rushes importés. L'effacer supprime le média ; les projets restent mais ne peuvent plus être lus.",
        ],
      },
      {
        heading: "Tiers",
        body: [
          "Les requêtes IA partent de notre serveur : aucun script tiers ne tourne dans votre navigateur pour elles. Aucune analytique embarquée, aucun gestionnaire de balises, aucun pixel social.",
        ],
      },
      {
        heading: "Vos choix",
        body: [
          "Réglages → Confidentialité exporte tout en JSON et vide le média en cache. Les contrôles de données de site du navigateur peuvent tout supprimer d'un coup.",
        ],
      },
    ],
  },
};

export const LEGAL: Record<string, Record<LegalSlug, LegalDocument>> = { en, ar, fr };

export function getLegalDocument(locale: string, slug: LegalSlug): LegalDocument {
  return (LEGAL[locale] ?? en)[slug];
}
