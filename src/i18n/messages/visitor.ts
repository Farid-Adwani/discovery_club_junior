import { defineMessages } from '../index';

/** Public landing page (VisitorPortal) and the robotics art it uses. */
export const visitorMessages = defineMessages({
  en: {
    // toasts

    // hero
    heroWords: 'robots|rovers|circuits|inventions',
    heroLine1: 'Where kids build',
    heroBeforeWord: 'real',
    heroAfterWord: '',
    heroLine3: 'and dream big.',
    heroBadgeEurobot: '🏆 Eurobot Junior 2026 · 1st place in Spain',
    heroFans: '@DiscoveryClubJunior · 4,200+ fans',
    chipAges: 'Ages 6–17',
    heroHandNote: 'built by our kids!',
    heroRingText: 'ROBOTICS · CODING · ELECTRONICS · MANOUBA · ',
    heroPolaroid: 'Champions in Spain!',
    heroCountries: 'Spain · Austria · Egypt',
    ribbonWords: 'Robotics|Coding|Electronics|3D printing|Competitions|Teamwork|Ages 6–17',
    heroIntro:
      'Discovery Club Junior is Manouba’s hands-on robotics, electronics and coding club. Kids and teens design, wire and program real robots, and take them to international competitions.',
    registerChild: 'Register your child',
    explorePrograms: 'Explore classes',
    heroLocation: 'Manouba, Tunisia',
    heroPodiums: 'International podiums',

    // stats
    statBuilders: 'Young builders',
    statWorkshops: 'Workshops run',
    statRobots: 'Robots built',
    statTrophies: 'Trophies won',

    // hero collage photos (keys kept from the old photo belt)
    addPhoto: 'Add a photo',
    belt1Title: 'Eurobot Junior victory',
    belt1Tag: '🏆 1st place',
    belt3Title: 'RoboCup Vienna',
    belt4Title: 'Honoured by the Ministry',
    belt4Tag: '🇹🇳 Official reception',
    belt6Title: 'ODA Robots',
    belt6Tag: '🥈 2nd prize',
    belt11Title: 'Flags of the world',
    belt11Tag: '🌍 International',

    // how it works
    stepBuildTitle: 'Build',
    stepBuildText: 'Gears, motors and chassis: kids assemble real mechanisms with their own hands.',
    stepWireTitle: 'Wire',
    stepWireText: 'Breadboards, sensors and LEDs: they learn how electricity really flows.',
    stepCodeTitle: 'Code',
    stepCodeText: 'Arduino, ESP32 and Python bring every robot to life, line by line.',
    stepCompeteTitle: 'Compete',
    stepCompeteText: 'From Manouba to Eurobot and RoboCup podiums across the world.',
    gameEyebrow: 'Try it yourself',
    gameTitle: 'Program the robot!',
    gameText: 'Put the blocks in order and press Run. That is exactly how our makers start, before moving on to real robots.',
    howEyebrow: 'How we learn',
    howTitle: 'From the first gear to the podium',
    howText: 'No passive screen time. Every session ends with something that moves, blinks or beeps.',

    // countdown
    nextEyebrow: 'Next international challenge',
    nextTitle: 'Eurobot Junior 2026 qualification round',
    nextText: 'Our young engineers are building autonomous rovers for the championship arena.',
    days: 'Days',
    hours: 'Hours',
    mins: 'Mins',
    secs: 'Secs',

    // photo timeline (public/photos/timeline)
    timelineEyebrow: 'Our journey',
    timelineTitle: 'Year after year, robot after robot',
    timelineText: 'Competitions, workshops and trips since {first}. Pick a year, then open an album to see all its photos.',
    timelineYears: 'Years',
    timelineAlbums: 'Albums',
    timelinePhotos: 'Photos',
    timelineChooseYear: 'Choose a year',
    timelineYearCount: '{albums} albums · {photos} photos',
    timelinePrevYear: 'Previous year',
    timelineNextYear: 'Next year',
    timelineOpenAlbum: '{title}: open the album ({n} photos)',
    kindCompetition: 'Competition',
    kindWorkshop: 'Workshop',
    kindCeremony: 'Event',
    kindTeam: 'Team',
    viewerPrev: 'Previous photo',
    viewerNext: 'Next photo',
    viewerCount: 'Photo {i} of {n}',
    timelineViews: 'Two ways to visit',
    timelineViewAlbums: 'Photo albums',
    timelineView3d: '3D museum',
    timelineView3dHint: 'Walk through the same albums in a 3D gallery',


    // programs
    programsEyebrow: '{count} classes every week',
    programsTitle: 'Pick a class for your child',
    programsText: 'Each class meets once a week in our labs. Filter by day to find the slot that suits your family.',
    perMonth: 'DT/mo',
    allDays: 'All days',
    noClasses: 'Classes will be announced soon.',
    kitIncluded: 'Kit included',

    // facebook feed
    filterAll: 'All posts ({count})',
    namePlaceholder: 'Your name (e.g. Parent, Visitor...)',
    close: 'Close',

    // upload modal
    change: 'Change',
    category: 'Category:',
    cancel: 'Cancel',

    // events

    // final CTA
    ctaTitle: 'Ready to build the future?',
    ctaText: 'Create your parent account in one minute, add all your children, and we’ll place each one in the right class.',

    // RoboticsArt
    // class cards
    ageRange: '{min}–{max} yrs',
    agePlus: '{min}+ yrs',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    tryFree: 'Book a free trial',

    // coaches
    coachesEyebrow: 'The team',
    coachesTitle: 'Meet the coaches',
    coachesText: 'Engineers and educators who build robots with your kids every week.',

    // testimonials
    testimonialsEyebrow: 'Parents say',
    testimonialsTitle: 'What families tell us',

    // faq
    faqEyebrow: 'Questions',
    faqTitle: 'Frequently asked questions',

    // contact & trial
    contactEyebrow: 'Come and try',
    contactTitle: 'Book a free trial class',
    contactText: 'Tell us about your child and we’ll reply on WhatsApp with the next free slot. No account needed.',
    trialParent: 'Your name',
    trialChild: 'Child’s first name',
    trialAge: 'Age',
    trialClass: 'Class you’re interested in',
    trialAnyClass: 'Not sure yet, advise me',
    trialPhone: 'Your phone',
    trialSend: 'Send on WhatsApp',
    trialSendEmail: 'Send by email',
    trialMessage: 'Hello Discovery Club Junior! I would like to book a free trial class.\nParent: {parent}\nChild: {child} ({age} years old)\nClass: {cls}\nPhone: {phone}',
    trialSubject: 'Free trial class request',
    whatsappUs: 'Chat on WhatsApp',
    callUs: 'Call us',
    emailUs: 'Email us',
    openInMaps: 'Open in Google Maps',
    mapTitle: 'Map showing where the club is',
    whatsappFloat: 'Contact us on WhatsApp',
    whatsappHello: 'Hello Discovery Club Junior! I have a question about your classes.',

    // page metadata
    metaTitle: 'Discovery Club Junior | Robotics & coding classes for kids in Manouba',
    metaDescription: 'Weekly robotics, electronics and coding classes for kids and teens in Manouba, Tunisia. Real hardware, small groups, international competitions. Book a free trial class.',
    logoAlt: 'Discovery Club Junior logo'
  },
  fr: {

    heroWords: 'robots|rovers|circuits|prototypes',
    heroLine1: 'Ici, les enfants construisent',
    heroBeforeWord: 'de vrais',
    heroAfterWord: '',
    heroLine3: 'et voient grand.',
    heroBadgeEurobot: '🏆 Eurobot Junior 2026 · 1re place en Espagne',
    heroFans: '@DiscoveryClubJunior · plus de 4 200 fans',
    chipAges: 'De 6 à 17 ans',
    heroHandNote: 'construit par nos jeunes !',
    heroRingText: 'ROBOTIQUE · CODE · ÉLECTRONIQUE · MANOUBA · ',
    heroPolaroid: 'Champions en Espagne !',
    heroCountries: 'Espagne · Autriche · Égypte',
    ribbonWords: 'Robotique|Code|Électronique|Impression 3D|Compétitions|Esprit d’équipe|De 6 à 17 ans',
    heroIntro:
      'Discovery Club Junior est le club de robotique, d’électronique et de programmation de Manouba, axé sur la pratique. Enfants et ados conçoivent, câblent et programment de vrais robots, et les emmènent en compétitions internationales.',
    registerChild: 'Inscrire votre enfant',
    explorePrograms: 'Découvrir les classes',
    heroLocation: 'Manouba, Tunisie',
    heroPodiums: 'Podiums internationaux',

    statBuilders: 'Jeunes inventeurs',
    statWorkshops: 'Ateliers animés',
    statRobots: 'Robots construits',
    statTrophies: 'Trophées remportés',

    addPhoto: 'Ajouter une photo',
    belt1Title: 'Victoire Eurobot Junior',
    belt1Tag: '🏆 1re place',
    belt3Title: 'RoboCup Vienne',
    belt4Title: 'Honneur du Ministère',
    belt4Tag: '🇹🇳 Réception officielle',
    belt6Title: 'ODA Robots',
    belt6Tag: '🥈 2e prix',
    belt11Title: 'Drapeaux du monde',
    belt11Tag: '🌍 International',

    stepBuildTitle: 'Construire',
    stepBuildText: 'Engrenages, moteurs et châssis : les enfants assemblent de vrais mécanismes de leurs propres mains.',
    stepWireTitle: 'Câbler',
    stepWireText: 'Platines d’essai, capteurs et LED : ils découvrent comment circule vraiment l’électricité.',
    stepCodeTitle: 'Programmer',
    stepCodeText: 'Arduino, ESP32 et Python donnent vie à chaque robot, ligne après ligne.',
    stepCompeteTitle: 'Concourir',
    stepCompeteText: 'De Manouba jusqu’aux podiums Eurobot et RoboCup partout dans le monde.',
    gameEyebrow: 'Essaie toi-même',
    gameTitle: 'Programme le robot !',
    gameText: 'Mets les blocs dans le bon ordre et appuie sur Lancer. C’est exactement comme ça que nos makers commencent, avant de passer aux vrais robots.',
    howEyebrow: 'Notre méthode',
    howTitle: 'Du premier engrenage au podium',
    howText: 'Pas d’écran passif. Chaque séance se termine par quelque chose qui bouge, clignote ou bipe.',

    nextEyebrow: 'Prochain défi international',
    nextTitle: 'Qualifications Eurobot Junior 2026',
    nextText: 'Nos jeunes ingénieurs construisent des rovers autonomes pour l’arène du championnat.',
    days: 'Jours',
    hours: 'Heures',
    mins: 'Min',
    secs: 'Sec',

    timelineEyebrow: 'Notre parcours',
    timelineTitle: 'Année après année, robot après robot',
    timelineText: 'Compétitions, ateliers et voyages depuis {first}. Choisissez une année, puis ouvrez un album pour voir toutes ses photos.',
    timelineYears: 'Années',
    timelineAlbums: 'Albums',
    timelinePhotos: 'Photos',
    timelineChooseYear: 'Choisir une année',
    timelineYearCount: '{albums} albums · {photos} photos',
    timelinePrevYear: 'Année précédente',
    timelineNextYear: 'Année suivante',
    timelineOpenAlbum: '{title} : ouvrir l’album ({n} photos)',
    kindCompetition: 'Compétition',
    kindWorkshop: 'Atelier',
    kindCeremony: 'Événement',
    kindTeam: 'Équipe',
    viewerPrev: 'Photo précédente',
    viewerNext: 'Photo suivante',
    viewerCount: 'Photo {i} sur {n}',
    timelineViews: 'Deux façons de visiter',
    timelineViewAlbums: 'Albums photo',
    timelineView3d: 'Musée 3D',
    timelineView3dHint: 'Parcourez les mêmes albums dans une galerie en 3D',

    programsEyebrow: '{count} classes chaque semaine',
    programsTitle: 'Choisissez une classe pour votre enfant',
    programsText: 'Chaque classe a lieu une fois par semaine dans nos labos. Filtrez par jour pour trouver le créneau qui vous convient.',
    perMonth: 'DT/mois',
    allDays: 'Tous les jours',
    noClasses: 'Les classes seront annoncées bientôt.',
    kitIncluded: 'Kit inclus',

    filterAll: 'Tous les posts ({count})',
    namePlaceholder: 'Votre nom (ex : Parent, Visiteur...)',
    close: 'Fermer',

    change: 'Changer',
    category: 'Catégorie :',
    cancel: 'Annuler',

    ctaTitle: 'Prêts à construire le futur ?',
    ctaText: 'Créez votre compte parent en une minute, ajoutez tous vos enfants, et nous placerons chacun dans la bonne classe.',

    // class cards
    ageRange: '{min}–{max} ans',
    agePlus: '{min} ans et +',
    levelBeginner: 'Débutant',
    levelIntermediate: 'Intermédiaire',
    levelAdvanced: 'Avancé',
    tryFree: 'Réserver un essai gratuit',

    // coaches
    coachesEyebrow: 'L’équipe',
    coachesTitle: 'Rencontrez les coachs',
    coachesText: 'Des ingénieurs et des pédagogues qui construisent des robots avec vos enfants chaque semaine.',

    // testimonials
    testimonialsEyebrow: 'Les parents en parlent',
    testimonialsTitle: 'Ce que nous disent les familles',

    // faq
    faqEyebrow: 'Questions',
    faqTitle: 'Questions fréquentes',

    // contact & trial
    contactEyebrow: 'Venez essayer',
    contactTitle: 'Réservez une séance d’essai gratuite',
    contactText: 'Parlez-nous de votre enfant, nous vous répondons sur WhatsApp avec le prochain créneau libre. Aucun compte nécessaire.',
    trialParent: 'Votre nom',
    trialChild: 'Prénom de l’enfant',
    trialAge: 'Âge',
    trialClass: 'Cours qui vous intéresse',
    trialAnyClass: 'Je ne sais pas encore, conseillez-moi',
    trialPhone: 'Votre téléphone',
    trialSend: 'Envoyer sur WhatsApp',
    trialSendEmail: 'Envoyer par e-mail',
    trialMessage: 'Bonjour Discovery Club Junior ! Je souhaite réserver une séance d’essai gratuite.\nParent : {parent}\nEnfant : {child} ({age} ans)\nCours : {cls}\nTéléphone : {phone}',
    trialSubject: 'Demande de séance d’essai gratuite',
    whatsappUs: 'Écrire sur WhatsApp',
    callUs: 'Appelez-nous',
    emailUs: 'Écrivez-nous',
    openInMaps: 'Ouvrir dans Google Maps',
    mapTitle: 'Carte indiquant l’emplacement du club',
    whatsappFloat: 'Nous contacter sur WhatsApp',
    whatsappHello: 'Bonjour Discovery Club Junior ! J’ai une question sur vos cours.',

    // page metadata
    metaTitle: 'Discovery Club Junior | Cours de robotique et de code pour enfants à Manouba',
    metaDescription: 'Cours hebdomadaires de robotique, d’électronique et de programmation pour enfants et ados à Manouba, Tunisie. Vrai matériel, petits groupes, compétitions internationales. Réservez une séance d’essai gratuite.',
    logoAlt: 'Logo de Discovery Club Junior'
  },
  ar: {

    heroWords: 'روبوتات|مركبات|دوائر|اختراعات',
    heroLine1: 'هنا يصنع الأطفال',
    heroBeforeWord: '',
    heroAfterWord: 'حقيقية',
    heroLine3: 'ويحلمون بلا حدود.',
    heroBadgeEurobot: '🏆 يوروبوت جونيور 2026 · المركز الأول في إسبانيا',
    heroFans: '@DiscoveryClubJunior · أكثر من 4200 متابع',
    chipAges: 'من 6 إلى 17 سنة',
    heroHandNote: 'من صنع أطفالنا!',
    heroRingText: 'روبوتيك · برمجة · إلكترونيك · منوبة · ',
    heroPolaroid: 'أبطال في إسبانيا!',
    heroCountries: 'إسبانيا · النمسا · مصر',
    ribbonWords: 'روبوتيك|برمجة|إلكترونيك|طباعة ثلاثية الأبعاد|مسابقات|روح الفريق|من 6 إلى 17 سنة',
    heroIntro:
      'Discovery Club Junior هو نادي الروبوتيك والإلكترونيك والبرمجة التطبيقي في منوبة. يصمّم الأطفال واليافعون روبوتات حقيقية ويوصلون دوائرها ويبرمجونها، ثم يشاركون بها في مسابقات دولية.',
    registerChild: 'سجّل طفلك',
    explorePrograms: 'اكتشف الأقسام',
    heroLocation: 'منوبة، تونس',
    heroPodiums: 'منصّات تتويج دولية',

    statBuilders: 'مبتكر صغير',
    statWorkshops: 'ورشة منجزة',
    statRobots: 'روبوت مصنوع',
    statTrophies: 'كأس محرزة',

    addPhoto: 'إضافة صورة',
    belt1Title: 'فوز في يوروبوت جونيور',
    belt1Tag: '🏆 المركز الأول',
    belt3Title: 'روبوكاب فيينا',
    belt4Title: 'تكريم من الوزارة',
    belt4Tag: '🇹🇳 استقبال رسمي',
    belt6Title: 'ODA Robots',
    belt6Tag: '🥈 الجائزة الثانية',
    belt11Title: 'أعلام العالم',
    belt11Tag: '🌍 دولي',

    stepBuildTitle: 'نبني',
    stepBuildText: 'تروس ومحرّكات وهياكل: يركّب الأطفال آليات حقيقية بأيديهم.',
    stepWireTitle: 'نوصّل',
    stepWireText: 'لوحات توصيل وحسّاسات ومصابيح LED: يتعلّمون كيف تسري الكهرباء فعلاً.',
    stepCodeTitle: 'نبرمج',
    stepCodeText: 'Arduino وESP32 وPython تبعث الحياة في كل روبوت، سطراً بعد سطر.',
    stepCompeteTitle: 'ننافس',
    stepCompeteText: 'من منوبة إلى منصّات يوروبوت وروبوكاب حول العالم.',
    gameEyebrow: 'جرّب بنفسك',
    gameTitle: 'برمج الروبوت!',
    gameText: 'رتّب الكتل واضغط تشغيل. هكذا يبدأ صنّاعنا الصغار قبل الانتقال إلى الروبوتات الحقيقية.',
    howEyebrow: 'كيف نتعلّم',
    howTitle: 'من الترس الأول إلى منصّة التتويج',
    howText: 'لا وقت للشاشات السلبية. كل حصة تنتهي بشيء يتحرّك أو يضيء أو يُصدر صوتاً.',

    nextEyebrow: 'التحدّي الدولي القادم',
    nextTitle: 'تصفيات يوروبوت جونيور 2026',
    nextText: 'مهندسونا الصغار يبنون مركبات ذاتية القيادة لساحة البطولة.',
    days: 'أيام',
    hours: 'ساعات',
    mins: 'دقائق',
    secs: 'ثوانٍ',

    timelineEyebrow: 'مسيرتنا',
    timelineTitle: 'عاماً بعد عام، روبوتاً بعد روبوت',
    timelineText: 'مسابقات وورشات ورحلات منذ {first}. اختر سنة ثم افتح ألبوماً لمشاهدة كل صوره.',
    timelineYears: 'سنوات',
    timelineAlbums: 'ألبومات',
    timelinePhotos: 'صور',
    timelineChooseYear: 'اختر سنة',
    timelineYearCount: 'الألبومات: {albums} · الصور: {photos}',
    timelinePrevYear: 'السنة السابقة',
    timelineNextYear: 'السنة التالية',
    timelineOpenAlbum: '{title}: فتح الألبوم (عدد الصور: {n})',
    kindCompetition: 'مسابقة',
    kindWorkshop: 'ورشة',
    kindCeremony: 'حدث',
    kindTeam: 'الفريق',
    viewerPrev: 'الصورة السابقة',
    viewerNext: 'الصورة التالية',
    viewerCount: 'الصورة {i} من {n}',
    timelineViews: 'طريقتان للزيارة',
    timelineViewAlbums: 'ألبومات الصور',
    timelineView3d: 'المتحف ثلاثي الأبعاد',
    timelineView3dHint: 'تجوّل بين الألبومات نفسها في معرض ثلاثي الأبعاد',

    programsEyebrow: '{count} أقسام كل أسبوع',
    programsTitle: 'اختر قسمًا لطفلك',
    programsText: 'يُعقد كل قسم مرة في الأسبوع في مخابرنا. صفِّ حسب اليوم لتجد الموعد المناسب لعائلتك.',
    perMonth: 'د.ت/شهر',
    allDays: 'كل الأيام',
    noClasses: 'سيتم الإعلان عن الأقسام قريبًا.',
    kitIncluded: 'العُدّة مشمولة',

    filterAll: 'كل المنشورات ({count})',
    namePlaceholder: 'اسمك (مثال: وليّ، زائر...)',
    close: 'إغلاق',

    change: 'تغيير',
    category: 'الفئة:',
    cancel: 'إلغاء',

    ctaTitle: 'مستعدّون لبناء المستقبل؟',
    ctaText: 'أنشئ حساب وليّ الأمر في دقيقة واحدة، وأضف جميع أطفالك، وسنضع كلاً منهم في القسم المناسب.',

    // class cards
    ageRange: '{min}–{max} سنة',
    agePlus: '{min} سنة فما فوق',
    levelBeginner: 'مبتدئ',
    levelIntermediate: 'متوسط',
    levelAdvanced: 'متقدم',
    tryFree: 'احجز حصة تجريبية مجانية',

    // coaches
    coachesEyebrow: 'الفريق',
    coachesTitle: 'تعرّف على المدربين',
    coachesText: 'مهندسون ومربّون يبنون الروبوتات مع أطفالكم كل أسبوع.',

    // testimonials
    testimonialsEyebrow: 'يقول الأولياء',
    testimonialsTitle: 'ما تقوله لنا العائلات',

    // faq
    faqEyebrow: 'أسئلة',
    faqTitle: 'الأسئلة الشائعة',

    // contact & trial
    contactEyebrow: 'تعال وجرّب',
    contactTitle: 'احجز حصة تجريبية مجانية',
    contactText: 'حدّثنا عن طفلك وسنردّ عليك عبر واتساب بأقرب موعد متاح. لا حاجة لإنشاء حساب.',
    trialParent: 'اسمك',
    trialChild: 'اسم الطفل',
    trialAge: 'العمر',
    trialClass: 'الحصة التي تهمّك',
    trialAnyClass: 'لست متأكدًا بعد، انصحوني',
    trialPhone: 'رقم هاتفك',
    trialSend: 'إرسال عبر واتساب',
    trialSendEmail: 'إرسال بالبريد الإلكتروني',
    trialMessage: 'مرحبًا Discovery Club Junior! أرغب في حجز حصة تجريبية مجانية.\nالولي: {parent}\nالطفل: {child} ({age} سنة)\nالحصة: {cls}\nالهاتف: {phone}',
    trialSubject: 'طلب حصة تجريبية مجانية',
    whatsappUs: 'راسلنا على واتساب',
    callUs: 'اتصل بنا',
    emailUs: 'راسلنا بالبريد',
    openInMaps: 'فتح في خرائط Google',
    mapTitle: 'خريطة تبيّن مكان النادي',
    whatsappFloat: 'تواصل معنا عبر واتساب',
    whatsappHello: 'مرحبًا Discovery Club Junior! لديّ سؤال حول حصصكم.',

    // page metadata
    metaTitle: 'Discovery Club Junior | حصص روبوتيك وبرمجة للأطفال في منوبة',
    metaDescription: 'حصص أسبوعية في الروبوتيك والإلكترونيك والبرمجة للأطفال والمراهقين في منوبة، تونس. معدات حقيقية، مجموعات صغيرة ومسابقات دولية. احجز حصة تجريبية مجانية.',
    logoAlt: 'شعار Discovery Club Junior'
  }
});
