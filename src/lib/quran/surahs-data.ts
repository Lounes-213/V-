export type SurahMeta = {
  number: number;
  nameArabic: string;
  nameSimple: string;
  nameTranslated: string;
  ayahCount: number;
  revelation: "makkah" | "madinah";
  bismillahPre: boolean;
};

export const ALL_SURAHS: SurahMeta[] = [
  {
    "number": 1,
    "nameArabic": "الفاتحة",
    "nameSimple": "Al-Fatihah",
    "nameTranslated": "L'ouverture",
    "ayahCount": 7,
    "revelation": "makkah",
    "bismillahPre": false
  },
  {
    "number": 2,
    "nameArabic": "البقرة",
    "nameSimple": "Al-Baqarah",
    "nameTranslated": "La vache",
    "ayahCount": 286,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 3,
    "nameArabic": "آل عمران",
    "nameSimple": "Ali 'Imran",
    "nameTranslated": "La famille de 'imran",
    "ayahCount": 200,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 4,
    "nameArabic": "النساء",
    "nameSimple": "An-Nisa",
    "nameTranslated": "Les femmes",
    "ayahCount": 176,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 5,
    "nameArabic": "المائدة",
    "nameSimple": "Al-Ma'idah",
    "nameTranslated": "La table servie",
    "ayahCount": 120,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 6,
    "nameArabic": "الأنعام",
    "nameSimple": "Al-An'am",
    "nameTranslated": "Les bestiaux",
    "ayahCount": 165,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 7,
    "nameArabic": "الأعراف",
    "nameSimple": "Al-A'raf",
    "nameTranslated": "Al-A'raf",
    "ayahCount": 206,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 8,
    "nameArabic": "الأنفال",
    "nameSimple": "Al-Anfal",
    "nameTranslated": "Le butin",
    "ayahCount": 75,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 9,
    "nameArabic": "التوبة",
    "nameSimple": "At-Tawbah",
    "nameTranslated": "Le repentir",
    "ayahCount": 129,
    "revelation": "madinah",
    "bismillahPre": false
  },
  {
    "number": 10,
    "nameArabic": "يونس",
    "nameSimple": "Yunus",
    "nameTranslated": "Jonas",
    "ayahCount": 109,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 11,
    "nameArabic": "هود",
    "nameSimple": "Hud",
    "nameTranslated": "Houd",
    "ayahCount": 123,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 12,
    "nameArabic": "يوسف",
    "nameSimple": "Yusuf",
    "nameTranslated": "Joseph",
    "ayahCount": 111,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 13,
    "nameArabic": "الرعد",
    "nameSimple": "Ar-Ra'd",
    "nameTranslated": "Le tonnerre",
    "ayahCount": 43,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 14,
    "nameArabic": "ابراهيم",
    "nameSimple": "Ibrahim",
    "nameTranslated": "Abraham",
    "ayahCount": 52,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 15,
    "nameArabic": "الحجر",
    "nameSimple": "Al-Hijr",
    "nameTranslated": "Al-Hijr",
    "ayahCount": 99,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 16,
    "nameArabic": "النحل",
    "nameSimple": "An-Nahl",
    "nameTranslated": "Les abeilles",
    "ayahCount": 128,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 17,
    "nameArabic": "الإسراء",
    "nameSimple": "Al-Isra",
    "nameTranslated": "Le voyage nocturne",
    "ayahCount": 111,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 18,
    "nameArabic": "الكهف",
    "nameSimple": "Al-Kahf",
    "nameTranslated": "La caverne",
    "ayahCount": 110,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 19,
    "nameArabic": "مريم",
    "nameSimple": "Maryam",
    "nameTranslated": "Marie",
    "ayahCount": 98,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 20,
    "nameArabic": "طه",
    "nameSimple": "Taha",
    "nameTranslated": "Ta-Ha",
    "ayahCount": 135,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 21,
    "nameArabic": "الأنبياء",
    "nameSimple": "Al-Anbya",
    "nameTranslated": "Les prophètes",
    "ayahCount": 112,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 22,
    "nameArabic": "الحج",
    "nameSimple": "Al-Hajj",
    "nameTranslated": "Le pèlerinage",
    "ayahCount": 78,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 23,
    "nameArabic": "المؤمنون",
    "nameSimple": "Al-Mu'minun",
    "nameTranslated": "Les croyants",
    "ayahCount": 118,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 24,
    "nameArabic": "النور",
    "nameSimple": "An-Nur",
    "nameTranslated": "La lumière",
    "ayahCount": 64,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 25,
    "nameArabic": "الفرقان",
    "nameSimple": "Al-Furqan",
    "nameTranslated": "Le discernement",
    "ayahCount": 77,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 26,
    "nameArabic": "الشعراء",
    "nameSimple": "Ash-Shu'ara",
    "nameTranslated": "Les poètes",
    "ayahCount": 227,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 27,
    "nameArabic": "النمل",
    "nameSimple": "An-Naml",
    "nameTranslated": "Les fourmis",
    "ayahCount": 93,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 28,
    "nameArabic": "القصص",
    "nameSimple": "Al-Qasas",
    "nameTranslated": "Le récit",
    "ayahCount": 88,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 29,
    "nameArabic": "العنكبوت",
    "nameSimple": "Al-'Ankabut",
    "nameTranslated": "L'araignée",
    "ayahCount": 69,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 30,
    "nameArabic": "الروم",
    "nameSimple": "Ar-Rum",
    "nameTranslated": "Les romains",
    "ayahCount": 60,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 31,
    "nameArabic": "لقمان",
    "nameSimple": "Luqman",
    "nameTranslated": "Louqman",
    "ayahCount": 34,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 32,
    "nameArabic": "السجدة",
    "nameSimple": "As-Sajdah",
    "nameTranslated": "La prosternation",
    "ayahCount": 30,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 33,
    "nameArabic": "الأحزاب",
    "nameSimple": "Al-Ahzab",
    "nameTranslated": "Les coalisés",
    "ayahCount": 73,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 34,
    "nameArabic": "سبإ",
    "nameSimple": "Saba",
    "nameTranslated": "Saba'",
    "ayahCount": 54,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 35,
    "nameArabic": "فاطر",
    "nameSimple": "Fatir",
    "nameTranslated": "Le Créateur",
    "ayahCount": 45,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 36,
    "nameArabic": "يس",
    "nameSimple": "Ya-Sin",
    "nameTranslated": "Ya-Sin",
    "ayahCount": 83,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 37,
    "nameArabic": "الصافات",
    "nameSimple": "As-Saffat",
    "nameTranslated": "Les rangés",
    "ayahCount": 182,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 38,
    "nameArabic": "ص",
    "nameSimple": "Sad",
    "nameTranslated": "Sad",
    "ayahCount": 88,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 39,
    "nameArabic": "الزمر",
    "nameSimple": "Az-Zumar",
    "nameTranslated": "Les groupes",
    "ayahCount": 75,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 40,
    "nameArabic": "غافر",
    "nameSimple": "Ghafir",
    "nameTranslated": "Le Pardonneur",
    "ayahCount": 85,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 41,
    "nameArabic": "فصلت",
    "nameSimple": "Fussilat",
    "nameTranslated": "Les versets explicites",
    "ayahCount": 54,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 42,
    "nameArabic": "الشورى",
    "nameSimple": "Ash-Shuraa",
    "nameTranslated": "La concertation",
    "ayahCount": 53,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 43,
    "nameArabic": "الزخرف",
    "nameSimple": "Az-Zukhruf",
    "nameTranslated": "L'ornement",
    "ayahCount": 89,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 44,
    "nameArabic": "الدخان",
    "nameSimple": "Ad-Dukhan",
    "nameTranslated": "La fumée",
    "ayahCount": 59,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 45,
    "nameArabic": "الجاثية",
    "nameSimple": "Al-Jathiyah",
    "nameTranslated": "L'agenouillée",
    "ayahCount": 37,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 46,
    "nameArabic": "الأحقاف",
    "nameSimple": "Al-Ahqaf",
    "nameTranslated": "Al-Ahqaf",
    "ayahCount": 35,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 47,
    "nameArabic": "محمد",
    "nameSimple": "Muhammad",
    "nameTranslated": "Mouhammad",
    "ayahCount": 38,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 48,
    "nameArabic": "الفتح",
    "nameSimple": "Al-Fath",
    "nameTranslated": "La victoire éclatante",
    "ayahCount": 29,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 49,
    "nameArabic": "الحجرات",
    "nameSimple": "Al-Hujurat",
    "nameTranslated": "Les appartements",
    "ayahCount": 18,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 50,
    "nameArabic": "ق",
    "nameSimple": "Qaf",
    "nameTranslated": "Qaf",
    "ayahCount": 45,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 51,
    "nameArabic": "الذاريات",
    "nameSimple": "Adh-Dhariyat",
    "nameTranslated": "Qui éparpillent",
    "ayahCount": 60,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 52,
    "nameArabic": "الطور",
    "nameSimple": "At-Tur",
    "nameTranslated": "Le mont At-Tour",
    "ayahCount": 49,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 53,
    "nameArabic": "النجم",
    "nameSimple": "An-Najm",
    "nameTranslated": "L'étoile",
    "ayahCount": 62,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 54,
    "nameArabic": "القمر",
    "nameSimple": "Al-Qamar",
    "nameTranslated": "La lune",
    "ayahCount": 55,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 55,
    "nameArabic": "الرحمن",
    "nameSimple": "Ar-Rahman",
    "nameTranslated": "Le Tout Miséricordieux",
    "ayahCount": 78,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 56,
    "nameArabic": "الواقعة",
    "nameSimple": "Al-Waqi'ah",
    "nameTranslated": "L'inévitable",
    "ayahCount": 96,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 57,
    "nameArabic": "الحديد",
    "nameSimple": "Al-Hadid",
    "nameTranslated": "Le fer",
    "ayahCount": 29,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 58,
    "nameArabic": "المجادلة",
    "nameSimple": "Al-Mujadila",
    "nameTranslated": "La discussion",
    "ayahCount": 22,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 59,
    "nameArabic": "الحشر",
    "nameSimple": "Al-Hashr",
    "nameTranslated": "L'exode",
    "ayahCount": 24,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 60,
    "nameArabic": "الممتحنة",
    "nameSimple": "Al-Mumtahanah",
    "nameTranslated": "L'éprouvée",
    "ayahCount": 13,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 61,
    "nameArabic": "الصف",
    "nameSimple": "As-Saf",
    "nameTranslated": "Le rang",
    "ayahCount": 14,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 62,
    "nameArabic": "الجمعة",
    "nameSimple": "Al-Jumu'ah",
    "nameTranslated": "Le vendredi",
    "ayahCount": 11,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 63,
    "nameArabic": "المنافقون",
    "nameSimple": "Al-Munafiqun",
    "nameTranslated": "Les hypocrites",
    "ayahCount": 11,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 64,
    "nameArabic": "التغابن",
    "nameSimple": "At-Taghabun",
    "nameTranslated": "La grande perte",
    "ayahCount": 18,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 65,
    "nameArabic": "الطلاق",
    "nameSimple": "At-Talaq",
    "nameTranslated": "Le divorce",
    "ayahCount": 12,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 66,
    "nameArabic": "التحريم",
    "nameSimple": "At-Tahrim",
    "nameTranslated": "L'interdiction",
    "ayahCount": 12,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 67,
    "nameArabic": "الملك",
    "nameSimple": "Al-Mulk",
    "nameTranslated": "La royauté",
    "ayahCount": 30,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 68,
    "nameArabic": "القلم",
    "nameSimple": "Al-Qalam",
    "nameTranslated": "La plume",
    "ayahCount": 52,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 69,
    "nameArabic": "الحاقة",
    "nameSimple": "Al-Haqqah",
    "nameTranslated": "L'inéluctable",
    "ayahCount": 52,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 70,
    "nameArabic": "المعارج",
    "nameSimple": "Al-Ma'arij",
    "nameTranslated": "Les voies d'ascension",
    "ayahCount": 44,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 71,
    "nameArabic": "نوح",
    "nameSimple": "Nuh",
    "nameTranslated": "Noé",
    "ayahCount": 28,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 72,
    "nameArabic": "الجن",
    "nameSimple": "Al-Jinn",
    "nameTranslated": "Les djinns",
    "ayahCount": 28,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 73,
    "nameArabic": "المزمل",
    "nameSimple": "Al-Muzzammil",
    "nameTranslated": "L'enveloppé",
    "ayahCount": 20,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 74,
    "nameArabic": "المدثر",
    "nameSimple": "Al-Muddaththir",
    "nameTranslated": "Celui qui se couvre",
    "ayahCount": 56,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 75,
    "nameArabic": "القيامة",
    "nameSimple": "Al-Qiyamah",
    "nameTranslated": "La résurrection",
    "ayahCount": 40,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 76,
    "nameArabic": "الانسان",
    "nameSimple": "Al-Insan",
    "nameTranslated": "L'homme",
    "ayahCount": 31,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 77,
    "nameArabic": "المرسلات",
    "nameSimple": "Al-Mursalat",
    "nameTranslated": "Les envoyés",
    "ayahCount": 50,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 78,
    "nameArabic": "النبإ",
    "nameSimple": "An-Naba",
    "nameTranslated": "La nouvelle",
    "ayahCount": 40,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 79,
    "nameArabic": "النازعات",
    "nameSimple": "An-Nazi'at",
    "nameTranslated": "Ceux qui arrachent",
    "ayahCount": 46,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 80,
    "nameArabic": "عبس",
    "nameSimple": "'Abasa",
    "nameTranslated": "Il s'est renfrogné",
    "ayahCount": 42,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 81,
    "nameArabic": "التكوير",
    "nameSimple": "At-Takwir",
    "nameTranslated": "L'obscurcissement",
    "ayahCount": 29,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 82,
    "nameArabic": "الإنفطار",
    "nameSimple": "Al-Infitar",
    "nameTranslated": "La rupture",
    "ayahCount": 19,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 83,
    "nameArabic": "المطففين",
    "nameSimple": "Al-Mutaffifin",
    "nameTranslated": "Les fraudeurs",
    "ayahCount": 36,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 84,
    "nameArabic": "الإنشقاق",
    "nameSimple": "Al-Inshiqaq",
    "nameTranslated": "La déchirure",
    "ayahCount": 25,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 85,
    "nameArabic": "البروج",
    "nameSimple": "Al-Buruj",
    "nameTranslated": "Les constellations",
    "ayahCount": 22,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 86,
    "nameArabic": "الطارق",
    "nameSimple": "At-Tariq",
    "nameTranslated": "L'astre nocturne",
    "ayahCount": 17,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 87,
    "nameArabic": "الأعلى",
    "nameSimple": "Al-A'la",
    "nameTranslated": "Le Très-Haut",
    "ayahCount": 19,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 88,
    "nameArabic": "الغاشية",
    "nameSimple": "Al-Ghashiyah",
    "nameTranslated": "L'enveloppante",
    "ayahCount": 26,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 89,
    "nameArabic": "الفجر",
    "nameSimple": "Al-Fajr",
    "nameTranslated": "L'aube",
    "ayahCount": 30,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 90,
    "nameArabic": "البلد",
    "nameSimple": "Al-Balad",
    "nameTranslated": "La cité",
    "ayahCount": 20,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 91,
    "nameArabic": "الشمس",
    "nameSimple": "Ash-Shams",
    "nameTranslated": "Le soleil",
    "ayahCount": 15,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 92,
    "nameArabic": "الليل",
    "nameSimple": "Al-Layl",
    "nameTranslated": "La nuit",
    "ayahCount": 21,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 93,
    "nameArabic": "الضحى",
    "nameSimple": "Ad-Duhaa",
    "nameTranslated": "Le jour montant",
    "ayahCount": 11,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 94,
    "nameArabic": "الشرح",
    "nameSimple": "Ash-Sharh",
    "nameTranslated": "L'ouverture",
    "ayahCount": 8,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 95,
    "nameArabic": "التين",
    "nameSimple": "At-Tin",
    "nameTranslated": "Les figues",
    "ayahCount": 8,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 96,
    "nameArabic": "العلق",
    "nameSimple": "Al-'Alaq",
    "nameTranslated": "L'adhérence",
    "ayahCount": 19,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 97,
    "nameArabic": "القدر",
    "nameSimple": "Al-Qadr",
    "nameTranslated": "La destinée",
    "ayahCount": 5,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 98,
    "nameArabic": "البينة",
    "nameSimple": "Al-Bayyinah",
    "nameTranslated": "La preuve",
    "ayahCount": 8,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 99,
    "nameArabic": "الزلزلة",
    "nameSimple": "Az-Zalzalah",
    "nameTranslated": "Le séisme",
    "ayahCount": 8,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 100,
    "nameArabic": "العاديات",
    "nameSimple": "Al-'Adiyat",
    "nameTranslated": "Les coursiers",
    "ayahCount": 11,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 101,
    "nameArabic": "القارعة",
    "nameSimple": "Al-Qari'ah",
    "nameTranslated": "Le fracas",
    "ayahCount": 11,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 102,
    "nameArabic": "التكاثر",
    "nameSimple": "At-Takathur",
    "nameTranslated": "La course aux richesses",
    "ayahCount": 8,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 103,
    "nameArabic": "العصر",
    "nameSimple": "Al-'Asr",
    "nameTranslated": "Le temps",
    "ayahCount": 3,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 104,
    "nameArabic": "الهمزة",
    "nameSimple": "Al-Humazah",
    "nameTranslated": "Les calomniateurs",
    "ayahCount": 9,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 105,
    "nameArabic": "الفيل",
    "nameSimple": "Al-Fil",
    "nameTranslated": "L'éléphant",
    "ayahCount": 5,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 106,
    "nameArabic": "قريش",
    "nameSimple": "Quraysh",
    "nameTranslated": "Les Quraysh",
    "ayahCount": 4,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 107,
    "nameArabic": "الماعون",
    "nameSimple": "Al-Ma'un",
    "nameTranslated": "L'entraide",
    "ayahCount": 7,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 108,
    "nameArabic": "الكوثر",
    "nameSimple": "Al-Kawthar",
    "nameTranslated": "L'abondance",
    "ayahCount": 3,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 109,
    "nameArabic": "الكافرون",
    "nameSimple": "Al-Kafirun",
    "nameTranslated": "Les mécréants",
    "ayahCount": 6,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 110,
    "nameArabic": "النصر",
    "nameSimple": "An-Nasr",
    "nameTranslated": "Le secours",
    "ayahCount": 3,
    "revelation": "madinah",
    "bismillahPre": true
  },
  {
    "number": 111,
    "nameArabic": "المسد",
    "nameSimple": "Al-Masad",
    "nameTranslated": "Les fibres",
    "ayahCount": 5,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 112,
    "nameArabic": "الإخلاص",
    "nameSimple": "Al-Ikhlas",
    "nameTranslated": "La sincérité",
    "ayahCount": 4,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 113,
    "nameArabic": "الفلق",
    "nameSimple": "Al-Falaq",
    "nameTranslated": "L'aube naissante",
    "ayahCount": 5,
    "revelation": "makkah",
    "bismillahPre": true
  },
  {
    "number": 114,
    "nameArabic": "الناس",
    "nameSimple": "An-Nas",
    "nameTranslated": "Les humains",
    "ayahCount": 6,
    "revelation": "makkah",
    "bismillahPre": true
  }
];
