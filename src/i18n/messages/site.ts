import { defineMessages } from '../index';

/** Site-wide bits: legal pages and links, sign-up consent, language switcher, loading. */
export const siteMessages = defineMessages({
  en: {
    privacyPolicy: 'Privacy policy',
    terms: 'Terms of use',
    legal: 'Legal',
    language: 'Language',
    loading: 'Loading…',
    lastUpdated: 'Last updated: {date}',
    toBeCompleted: 'to be completed',
    backHome: 'Back to home',
    contactUs: 'Contact',
    // sign-up consent
    consentTermsBefore: 'I have read and accept the',
    consentAnd: 'and the',
    consentRequired: 'Please accept the terms of use and the privacy policy to continue.',
    photoConsent: 'I allow the club to publish photos of my child (website, Facebook). I can withdraw this at any time.',
    skipIntro: 'Skip intro'
  },
  fr: {
    privacyPolicy: 'Politique de confidentialité',
    terms: 'Conditions d’utilisation',
    legal: 'Mentions légales',
    language: 'Langue',
    loading: 'Chargement…',
    lastUpdated: 'Dernière mise à jour : {date}',
    toBeCompleted: 'à compléter',
    backHome: 'Retour à l’accueil',
    contactUs: 'Contact',
    consentTermsBefore: 'J’ai lu et j’accepte les',
    consentAnd: 'et la',
    consentRequired: 'Veuillez accepter les conditions d’utilisation et la politique de confidentialité pour continuer.',
    photoConsent: 'J’autorise le club à publier des photos de mon enfant (site web, Facebook). Je peux retirer cette autorisation à tout moment.',
    skipIntro: 'Passer l’introduction'
  },
  ar: {
    privacyPolicy: 'سياسة الخصوصية',
    terms: 'شروط الاستخدام',
    legal: 'معلومات قانونية',
    language: 'اللغة',
    loading: 'جارٍ التحميل…',
    lastUpdated: 'آخر تحديث: {date}',
    toBeCompleted: 'يُستكمل لاحقًا',
    backHome: 'العودة إلى الرئيسية',
    contactUs: 'الاتصال',
    consentTermsBefore: 'قرأت وأوافق على',
    consentAnd: 'و',
    consentRequired: 'يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة.',
    photoConsent: 'أسمح للنادي بنشر صور طفلي (الموقع، فيسبوك). يمكنني سحب هذا الإذن في أي وقت.',
    skipIntro: 'تخطي المقدمة'
  }
});
