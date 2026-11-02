import type { Lang } from '../index';

/**
 * Privacy policy and terms of use. A general template for a children's club in Tunisia:
 * have it checked before relying on it. Words in braces are filled in from
 * src/data/siteContent.ts ({club}, {controller}, {registration}, {address}, {email}, {phone},
 * {retention}, {courts}); a missing value shows as "to be completed".
 */
export type LegalSection = { title: string; body: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

export const PRIVACY: Record<Lang, LegalDoc> = {
  en: {
    title: 'Privacy policy',
    intro:
      'This policy explains what personal data {club} collects through this website and the parent, trainer and admin portals, why, and what rights you have. Because most of the people concerned are children, we collect as little as we can and only through their parent or legal guardian.',
    sections: [
      {
        title: '1. Who is responsible',
        body: [
          'The data controller is {controller} ({registration}), {address}.',
          'For any question or request about your data, write to {email} or call {phone}.'
        ]
      },
      {
        title: '2. What we collect',
        body: [
          'Parent or guardian: name, phone number, email address and password. Passwords are stored only in a scrambled (hashed) form that nobody at the club can read.',
          'Child: first and last name, date of birth, the class they attend, attendance, the trainer’s marks and remarks, and any note you choose to give us (for example an allergy). A profile photo only if you add one.',
          'Payments: monthly fees, amounts paid and shop orders.',
          'Technical: a sign-in token and your language choice kept in your browser, and, if you turn them on, the address your device uses to receive notifications. We use no advertising or tracking cookies.'
        ]
      },
      {
        title: '3. Why we use it',
        body: [
          'To register children, place them in a class, take attendance, follow their progress and keep parents informed (contract with the parent).',
          'To manage fees, receipts and our accounts (contract and legal obligations).',
          'To publish photos of children and to send notifications, only with the parent’s consent.',
          'To keep children safe during activities, for example by knowing about an allergy (vital interest and consent).'
        ]
      },
      {
        title: '4. Photos of children',
        body: [
          'We publish photos of a child on this website or on our social media only if the parent has given permission, at sign-up or later. We do not put a child’s full name next to their photo.',
          'You can withdraw permission at any time by contacting us. We then stop publishing new photos and remove existing ones from the website and our pages within a reasonable time. Photos already shared by others or published by the press are outside our control.'
        ]
      },
      {
        title: '5. Who can see the data',
        body: [
          'Parents see only their own children. Trainers see what they need to teach their classes. Club administrators see the data needed to run the club.',
          'The site runs on Google Firebase (database) and Vercel (hosting). Their servers may be located outside Tunisia, in particular in the European Union or the United States; they process the data only on our behalf. We never sell personal data and never use it for advertising.'
        ]
      },
      {
        title: '6. How long we keep it',
        body: [
          'Data is kept while the child attends the club and for {retention} after they leave, then deleted or made anonymous. Accounting records are kept for as long as the law requires.'
        ]
      },
      {
        title: '7. Security',
        body: [
          'All traffic is encrypted (HTTPS), access is limited by role, passwords are hashed, and the database cannot be reached directly from browsers.'
        ]
      },
      {
        title: '8. Your rights',
        body: [
          'Under Tunisian Organic Law No. 2004-63 of 27 July 2004 on the protection of personal data, and in line with the principles of the EU General Data Protection Regulation (GDPR), you can ask to access, correct or delete your data and your child’s data, object to some uses, withdraw a consent at any time, and receive a copy of your data.',
          'Send your request to {email}. We answer within one month. You can also complain to the Instance Nationale de Protection des Données Personnelles (INPDP, www.inpdp.tn).'
        ]
      },
      {
        title: '9. Children',
        body: ['Accounts are created by a parent or legal guardian. Children do not create accounts themselves.']
      },
      {
        title: '10. Changes',
        body: ['We may update this policy. The date at the top shows the latest version; important changes are announced to parents.']
      }
    ]
  },
  fr: {
    title: 'Politique de confidentialité',
    intro:
      'Cette politique explique quelles données personnelles {club} collecte via ce site et les espaces parents, entraîneurs et administration, pourquoi, et quels sont vos droits. Les personnes concernées étant surtout des enfants, nous collectons le strict nécessaire et uniquement par l’intermédiaire de leur parent ou tuteur légal.',
    sections: [
      {
        title: '1. Responsable du traitement',
        body: [
          'Le responsable du traitement est {controller} ({registration}), {address}.',
          'Pour toute question ou demande concernant vos données, écrivez à {email} ou appelez le {phone}.'
        ]
      },
      {
        title: '2. Données collectées',
        body: [
          'Parent ou tuteur : nom, téléphone, adresse e-mail et mot de passe. Les mots de passe sont enregistrés uniquement sous forme chiffrée (hachée), illisible pour le club.',
          'Enfant : nom et prénom, date de naissance, cours suivi, présences, notes et remarques de l’entraîneur, et toute information que vous choisissez de nous donner (par exemple une allergie). Une photo de profil seulement si vous en ajoutez une.',
          'Paiements : frais mensuels, montants payés et commandes de la boutique.',
          'Données techniques : un jeton de connexion et votre choix de langue enregistrés dans votre navigateur et, si vous les activez, l’adresse utilisée par votre appareil pour recevoir les notifications. Nous n’utilisons aucun cookie publicitaire ou de suivi.'
        ]
      },
      {
        title: '3. Finalités',
        body: [
          'Inscrire les enfants, les placer dans un cours, gérer les présences, suivre leurs progrès et informer les parents (contrat avec le parent).',
          'Gérer les frais, les reçus et notre comptabilité (contrat et obligations légales).',
          'Publier des photos des enfants et envoyer des notifications, uniquement avec le consentement du parent.',
          'Assurer la sécurité des enfants pendant les activités, par exemple en connaissant une allergie (intérêt vital et consentement).'
        ]
      },
      {
        title: '4. Photos des enfants',
        body: [
          'Nous publions la photo d’un enfant sur ce site ou sur nos réseaux sociaux seulement si le parent l’a autorisé, à l’inscription ou plus tard. Nous n’associons jamais le nom complet d’un enfant à sa photo.',
          'Vous pouvez retirer cette autorisation à tout moment en nous contactant. Nous cessons alors de publier de nouvelles photos et retirons les photos existantes du site et de nos pages dans un délai raisonnable. Les photos déjà partagées par des tiers ou publiées par la presse échappent à notre contrôle.'
        ]
      },
      {
        title: '5. Destinataires',
        body: [
          'Les parents ne voient que leurs propres enfants. Les entraîneurs voient ce dont ils ont besoin pour leurs cours. Les administrateurs du club voient les données nécessaires à son fonctionnement.',
          'Le site fonctionne avec Google Firebase (base de données) et Vercel (hébergement). Leurs serveurs peuvent se trouver hors de Tunisie, notamment dans l’Union européenne ou aux États-Unis ; ils traitent les données uniquement pour notre compte. Nous ne vendons jamais de données personnelles et ne les utilisons jamais à des fins publicitaires.'
        ]
      },
      {
        title: '6. Durée de conservation',
        body: [
          'Les données sont conservées tant que l’enfant fréquente le club et pendant {retention} après son départ, puis supprimées ou anonymisées. Les pièces comptables sont conservées pendant la durée exigée par la loi.'
        ]
      },
      {
        title: '7. Sécurité',
        body: [
          'Toutes les communications sont chiffrées (HTTPS), l’accès est limité selon le rôle, les mots de passe sont hachés et la base de données n’est pas accessible directement depuis les navigateurs.'
        ]
      },
      {
        title: '8. Vos droits',
        body: [
          'Conformément à la loi organique n° 2004-63 du 27 juillet 2004 portant sur la protection des données à caractère personnel, et dans l’esprit du Règlement général européen sur la protection des données (RGPD), vous pouvez demander l’accès, la rectification ou la suppression de vos données et de celles de votre enfant, vous opposer à certains traitements, retirer un consentement à tout moment et recevoir une copie de vos données.',
          'Adressez votre demande à {email}. Nous répondons dans un délai d’un mois. Vous pouvez aussi saisir l’Instance Nationale de Protection des Données Personnelles (INPDP, www.inpdp.tn).'
        ]
      },
      {
        title: '9. Enfants',
        body: ['Les comptes sont créés par un parent ou un tuteur légal. Les enfants ne créent pas de compte eux-mêmes.']
      },
      {
        title: '10. Modifications',
        body: ['Nous pouvons mettre à jour cette politique. La date en haut de la page indique la dernière version ; les changements importants sont annoncés aux parents.']
      }
    ]
  },
  ar: {
    title: 'سياسة الخصوصية',
    intro:
      'توضّح هذه السياسة المعطيات الشخصية التي يجمعها {club} عبر هذا الموقع وفضاءات الأولياء والمدربين والإدارة، وسبب جمعها، وما هي حقوقك. ولأن أغلب المعنيين أطفال، فإننا نجمع أقل ما يمكن، وفقط عن طريق الولي أو الوصي القانوني.',
    sections: [
      {
        title: '1. المسؤول عن المعالجة',
        body: [
          'المسؤول عن معالجة المعطيات هو {controller} ({registration})، {address}.',
          'لأي سؤال أو طلب يخص معطياتك، راسلنا على {email} أو اتصل على {phone}.'
        ]
      },
      {
        title: '2. المعطيات التي نجمعها',
        body: [
          'الولي أو الوصي: الاسم، رقم الهاتف، البريد الإلكتروني وكلمة المرور. تُحفظ كلمات المرور في شكل مشفّر (مُجزّأ) لا يمكن لأحد في النادي قراءته.',
          'الطفل: الاسم واللقب، تاريخ الولادة، الحصة التي يتابعها، الحضور، أعداد المدرب وملاحظاته، وأي معلومة تختار إعطاءنا إياها (مثل الحساسية). وصورة شخصية فقط إذا أضفتها.',
          'المدفوعات: المعاليم الشهرية، المبالغ المدفوعة وطلبات المتجر.',
          'معطيات تقنية: رمز الدخول واختيار اللغة المحفوظان في متصفحك، وعنوان استقبال الإشعارات على جهازك إذا فعّلتها. لا نستعمل أي ملفات تعريف ارتباط إشهارية أو للتتبّع.'
        ]
      },
      {
        title: '3. أغراض الاستعمال',
        body: [
          'تسجيل الأطفال، إلحاقهم بحصة، متابعة الحضور والتقدّم وإعلام الأولياء (عقد مع الولي).',
          'التصرّف في المعاليم والوصولات والمحاسبة (العقد والواجبات القانونية).',
          'نشر صور الأطفال وإرسال الإشعارات، فقط بموافقة الولي.',
          'ضمان سلامة الأطفال أثناء الأنشطة، مثل معرفة وجود حساسية (مصلحة حيوية وموافقة).'
        ]
      },
      {
        title: '4. صور الأطفال',
        body: [
          'لا ننشر صورة طفل على هذا الموقع أو على صفحاتنا في مواقع التواصل إلا بإذن من الولي، عند التسجيل أو لاحقًا. ولا نضع الاسم الكامل للطفل بجانب صورته.',
          'يمكنك سحب الإذن في أي وقت بالاتصال بنا. نتوقف حينها عن نشر صور جديدة ونحذف الصور الموجودة من الموقع ومن صفحاتنا في أجل معقول. أما الصور التي شاركها آخرون أو نشرتها الصحافة فهي خارج سيطرتنا.'
        ]
      },
      {
        title: '5. من يطّلع على المعطيات',
        body: [
          'لا يرى الولي إلا أطفاله. ويرى المدربون ما يحتاجونه لتدريس حصصهم. ويرى مسيّرو النادي المعطيات اللازمة لتسييره.',
          'يعمل الموقع بخدمات Google Firebase (قاعدة البيانات) وVercel (الاستضافة). قد تكون خوادمها خارج تونس، خاصة في الاتحاد الأوروبي أو الولايات المتحدة، وهي تعالج المعطيات لحسابنا فقط. لا نبيع المعطيات الشخصية أبدًا ولا نستعملها في الإشهار.'
        ]
      },
      {
        title: '6. مدة الحفظ',
        body: [
          'تُحفظ المعطيات طيلة فترة التحاق الطفل بالنادي ولمدة {retention} بعد مغادرته، ثم تُحذف أو تُجعل مجهولة الهوية. وتُحفظ الوثائق المحاسبية للمدة التي يفرضها القانون.'
        ]
      },
      {
        title: '7. الأمان',
        body: ['كل الاتصالات مشفّرة (HTTPS)، والنفاذ محدود حسب الدور، وكلمات المرور مُجزّأة، ولا يمكن الوصول إلى قاعدة البيانات مباشرة من المتصفحات.']
      },
      {
        title: '8. حقوقك',
        body: [
          'طبقًا للقانون الأساسي عدد 63 لسنة 2004 المؤرخ في 27 جويلية 2004 المتعلق بحماية المعطيات الشخصية، وتماشيًا مع مبادئ اللائحة الأوروبية العامة لحماية البيانات (RGPD)، يمكنك طلب النفاذ إلى معطياتك ومعطيات طفلك أو تصحيحها أو حذفها، والاعتراض على بعض الاستعمالات، وسحب موافقتك في أي وقت، والحصول على نسخة من معطياتك.',
          'أرسل طلبك إلى {email}. نجيب في أجل شهر. ويمكنك أيضًا تقديم شكوى إلى الهيئة الوطنية لحماية المعطيات الشخصية (INPDP، www.inpdp.tn).'
        ]
      },
      {
        title: '9. الأطفال',
        body: ['يُنشئ الحسابات الولي أو الوصي القانوني. ولا يُنشئ الأطفال حسابات بأنفسهم.']
      },
      {
        title: '10. التعديلات',
        body: ['قد نُحدّث هذه السياسة. يبيّن التاريخ في أعلى الصفحة آخر نسخة، ويُعلَم الأولياء بالتغييرات المهمة.']
      }
    ]
  }
};

export const TERMS: Record<Lang, LegalDoc> = {
  en: {
    title: 'Terms of use',
    intro: 'These terms apply to the website of {club} and to enrolment in its activities. By creating an account you accept them.',
    sections: [
      {
        title: '1. The club',
        body: ['{club} ({controller}, {registration}) runs robotics, electronics and coding activities for children and teenagers at {address}.']
      },
      {
        title: '2. Accounts',
        body: [
          'Accounts are created by a parent or legal guardian, who must give accurate information and keep it up to date.',
          'Keep your password secret. You are responsible for what is done with your account; tell us straight away if you think someone else is using it.'
        ]
      },
      {
        title: '3. Enrolment and places',
        body: [
          'A new child is first placed on a waiting list. The club then offers a class according to age, level and available places. A place is confirmed once the club has placed the child in a class.'
        ]
      },
      {
        title: '4. Fees',
        body: [
          'The monthly fee of each class is shown on the website and in the parent portal. Fees are paid as agreed with the club, normally at the start of each month. Unless the club agrees otherwise, a month that has started is due in full.',
          'The club may change its prices; parents are told before the change applies.'
        ]
      },
      {
        title: '5. Safety and behaviour',
        body: [
          'Children must respect the trainers, the other children and the equipment. Parents bring and collect their children on time and tell the club about any health information that matters for their safety.',
          'The club may suspend a child whose behaviour puts others at risk, after talking with the parents.'
        ]
      },
      {
        title: '6. Equipment',
        body: ['Kits and tools lent during sessions remain the property of the club unless they were bought. Damage caused on purpose may be charged.']
      },
      {
        title: '7. Photos',
        body: ['Photos of children are published only with the parent’s permission, as explained in the privacy policy.']
      },
      {
        title: '8. Competitions and trips',
        body: ['Taking part in competitions or trips is optional and is subject to separate information and written authorisation from the parents.']
      },
      {
        title: '9. Liability',
        body: [
          'The club takes reasonable care to supervise children and to keep the website available, but cannot guarantee that the website will always work without interruption. Nothing in these terms limits liability where the law does not allow it.'
        ]
      },
      {
        title: '10. Ending the enrolment',
        body: ['A parent can end a child’s enrolment at any time by telling the club. The parent can also ask for the account and its data to be deleted (see the privacy policy).']
      },
      {
        title: '11. Applicable law',
        body: ['These terms are governed by Tunisian law. Any dispute that cannot be settled amicably goes to the competent courts of {courts}.']
      },
      {
        title: '12. Contact',
        body: ['{email} · {phone}']
      }
    ]
  },
  fr: {
    title: 'Conditions d’utilisation',
    intro: 'Ces conditions s’appliquent au site de {club} et à l’inscription à ses activités. En créant un compte, vous les acceptez.',
    sections: [
      {
        title: '1. Le club',
        body: ['{club} ({controller}, {registration}) propose des activités de robotique, d’électronique et de programmation pour enfants et adolescents à {address}.']
      },
      {
        title: '2. Comptes',
        body: [
          'Les comptes sont créés par un parent ou un tuteur légal, qui doit fournir des informations exactes et les tenir à jour.',
          'Gardez votre mot de passe secret. Vous êtes responsable de l’utilisation de votre compte ; prévenez-nous immédiatement si vous pensez qu’une autre personne l’utilise.'
        ]
      },
      {
        title: '3. Inscription et places',
        body: [
          'Un nouvel enfant est d’abord placé sur liste d’attente. Le club propose ensuite un cours selon l’âge, le niveau et les places disponibles. La place est confirmée lorsque le club a placé l’enfant dans un cours.'
        ]
      },
      {
        title: '4. Frais',
        body: [
          'Les frais mensuels de chaque cours sont indiqués sur le site et dans l’espace parents. Ils sont réglés selon les modalités convenues avec le club, normalement au début de chaque mois. Sauf accord du club, tout mois commencé est dû en entier.',
          'Le club peut modifier ses tarifs ; les parents sont prévenus avant l’application du changement.'
        ]
      },
      {
        title: '5. Sécurité et comportement',
        body: [
          'Les enfants respectent les entraîneurs, les autres enfants et le matériel. Les parents déposent et récupèrent leurs enfants à l’heure et informent le club de toute information de santé utile à leur sécurité.',
          'Le club peut suspendre un enfant dont le comportement met les autres en danger, après en avoir parlé avec les parents.'
        ]
      },
      {
        title: '6. Matériel',
        body: ['Les kits et outils prêtés pendant les séances restent la propriété du club sauf s’ils ont été achetés. Les dégâts volontaires peuvent être facturés.']
      },
      {
        title: '7. Photos',
        body: ['Les photos des enfants ne sont publiées qu’avec l’autorisation du parent, comme expliqué dans la politique de confidentialité.']
      },
      {
        title: '8. Compétitions et voyages',
        body: ['La participation aux compétitions ou aux voyages est facultative et fait l’objet d’une information séparée et d’une autorisation écrite des parents.']
      },
      {
        title: '9. Responsabilité',
        body: [
          'Le club apporte un soin raisonnable à l’encadrement des enfants et à la disponibilité du site, sans pouvoir garantir un fonctionnement sans interruption. Rien dans ces conditions ne limite la responsabilité lorsque la loi ne le permet pas.'
        ]
      },
      {
        title: '10. Fin de l’inscription',
        body: ['Un parent peut mettre fin à l’inscription de son enfant à tout moment en prévenant le club. Il peut aussi demander la suppression du compte et de ses données (voir la politique de confidentialité).']
      },
      {
        title: '11. Droit applicable',
        body: ['Ces conditions sont régies par le droit tunisien. Tout litige qui ne peut être réglé à l’amiable relève des tribunaux compétents de {courts}.']
      },
      {
        title: '12. Contact',
        body: ['{email} · {phone}']
      }
    ]
  },
  ar: {
    title: 'شروط الاستخدام',
    intro: 'تنطبق هذه الشروط على موقع {club} وعلى التسجيل في أنشطته. بإنشاء حساب، فإنك توافق عليها.',
    sections: [
      {
        title: '1. النادي',
        body: ['يقدّم {club} ({controller}، {registration}) أنشطة في الروبوتيك والإلكترونيك والبرمجة للأطفال والمراهقين بـ {address}.']
      },
      {
        title: '2. الحسابات',
        body: [
          'يُنشئ الحسابات الولي أو الوصي القانوني، وعليه تقديم معلومات صحيحة وتحديثها.',
          'حافظ على سرية كلمة المرور. أنت مسؤول عن استعمال حسابك، فأعلمنا فورًا إذا اعتقدت أن شخصًا آخر يستعمله.'
        ]
      },
      {
        title: '3. التسجيل والأماكن',
        body: [
          'يُوضع الطفل الجديد أولًا في قائمة الانتظار، ثم يقترح النادي حصة حسب العمر والمستوى والأماكن المتاحة. ويُؤكَّد المكان عندما يُلحق النادي الطفل بحصة.'
        ]
      },
      {
        title: '4. المعاليم',
        body: [
          'المعلوم الشهري لكل حصة مبيّن في الموقع وفي فضاء الأولياء. ويُدفع حسب ما يُتّفق عليه مع النادي، عادة في بداية كل شهر. وما لم يوافق النادي على خلاف ذلك، فإن كل شهر بدأ يُستحق كاملًا.',
          'يمكن للنادي تغيير أسعاره، ويُعلَم الأولياء قبل تطبيق التغيير.'
        ]
      },
      {
        title: '5. السلامة والسلوك',
        body: [
          'على الأطفال احترام المدربين وبقية الأطفال والمعدات. ويُحضر الأولياء أطفالهم ويأخذونهم في الوقت المحدد، ويُعلمون النادي بأي معلومة صحية تهم سلامتهم.',
          'يمكن للنادي إيقاف طفل يعرّض سلوكه الآخرين للخطر، بعد الحديث مع الأولياء.'
        ]
      },
      {
        title: '6. المعدات',
        body: ['تبقى العُدد والأدوات المعارة أثناء الحصص ملكًا للنادي ما لم يتم شراؤها. ويمكن احتساب الأضرار المتعمّدة.']
      },
      {
        title: '7. الصور',
        body: ['لا تُنشر صور الأطفال إلا بإذن الولي، كما هو موضّح في سياسة الخصوصية.']
      },
      {
        title: '8. المسابقات والرحلات',
        body: ['المشاركة في المسابقات أو الرحلات اختيارية، وتخضع لإعلام منفصل ولترخيص كتابي من الأولياء.']
      },
      {
        title: '9. المسؤولية',
        body: [
          'يبذل النادي عناية معقولة في تأطير الأطفال وفي إتاحة الموقع، دون أن يضمن اشتغاله دون انقطاع. ولا شيء في هذه الشروط يحدّ من المسؤولية حين لا يسمح القانون بذلك.'
        ]
      },
      {
        title: '10. إنهاء التسجيل',
        body: ['يمكن للولي إنهاء تسجيل طفله في أي وقت بإعلام النادي، كما يمكنه طلب حذف الحساب ومعطياته (انظر سياسة الخصوصية).']
      },
      {
        title: '11. القانون المنطبق',
        body: ['تخضع هذه الشروط للقانون التونسي. وكل نزاع لا يُحلّ بالتراضي يكون من اختصاص المحاكم المختصة بـ {courts}.']
      },
      {
        title: '12. الاتصال',
        body: ['{email} · {phone}']
      }
    ]
  }
};
