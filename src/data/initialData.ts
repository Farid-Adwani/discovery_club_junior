import { Trainer, Group, Student, Product, ProductOrder, SessionRecord, MaterialRequest } from '../types';

// Photos live in /public/photos so their URLs are stable and can be stored in the database
const eurobotSpainChampions = '/photos/eurobot_spain_champions.jpg';
const eurobotSpainTrophyCert = '/photos/eurobot_spain_trophy_cert.jpg';
const eurobotSpainStage = '/photos/eurobot_spain_stage.jpg';
const ministryHonorCeremony = '/photos/ministry_honor_ceremony.jpeg';
const robocupViennaMarxHalle = '/photos/robocup_vienna_marx_halle.jpg';
const robocupJuniorEgypt = '/photos/robocup_junior_egypt.jpg';
const robocupEgyptTeam = '/photos/robocup_egypt_team.jpg';
const odaRobots2ndPrize = '/photos/oda_robots_2nd_prize.jpg';
const eurobotJuniorTunisiaQualif = '/photos/eurobot_junior_tunisia_qualif.jpg';
const internationalFriendsThailand = '/photos/international_friends_thailand.jpg';
const officialTrophyReception = '/photos/official_trophy_reception.jpg';
const airportDepartureTunis = '/photos/airport_departure_tunis.jpg';
const airportDeparturePalestine = '/photos/airport_departure_palestine.jpg';
const istanbulAirportEuropeanChamp = '/photos/istanbul_airport_european_champ.jpg';
const nationsFlags = '/photos/nations_flags.jpg';
const clubLogo = '/photos/logo.png';

export const CLUB_PHOTOS = {
  eurobotSpainChampions,
  eurobotSpainTrophyCert,
  eurobotSpainStage,
  ministryHonorCeremony,
  robocupViennaMarxHalle,
  robocupJuniorEgypt,
  robocupEgyptTeam,
  odaRobots2ndPrize,
  eurobotJuniorTunisiaQualif,
  internationalFriendsThailand,
  officialTrophyReception,
  airportDepartureTunis,
  airportDeparturePalestine,
  istanbulAirportEuropeanChamp,
  nationsFlags,
  // Official club logo, used in header/footer/login cards
  clubLogo,
  clubAvatar: clubLogo,
  // Team in club colours, used for the hoodie / merchandise sections
  teamInClubColors: odaRobots2ndPrize
};

export const INITIAL_TRAINERS: Trainer[] = [
  {
    id: 'tr-1',
    name: 'Karim Ben Salem',
    specialization: 'Embedded Systems & Arduino',
    email: 'k.bensalem@discoveryclubjunior.org',
    phone: '+216 98 123 456',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Mechatronics Engineer with 6 years experience mentoring youth national robotics champions.'
  },
  {
    id: 'tr-2',
    name: 'Nour El Houda Mansour',
    specialization: 'Robotics & STEM Pedagogy',
    email: 'n.mansour@discoveryclubjunior.org',
    phone: '+216 55 987 654',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    bio: 'Specialist in playful science education, Lego Spike Master Trainer, and creative pedagogy lead.'
  },
  {
    id: 'tr-3',
    name: 'Youssef Trabelsi',
    specialization: 'Python & Machine Learning',
    email: 'y.trabelsi@discoveryclubjunior.org',
    phone: '+216 22 456 789',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'AI researcher and open-source enthusiast focused on empowering teenagers with practical machine learning.'
  }
];

export const INITIAL_GROUPS: Group[] = [
  {
    id: 'grp-rob-sat-am',
    name: 'Robotics Juniors - Alpha',
    description: 'Foundational tactile engineering, gear ratios, kinetic mechanisms, and visual block logic using LEGO Education & modular rover kits.',
    pricePerMonth: 85,
    trainerIds: ['tr-2'],
    dayOfWeek: 'Saturday',
    timeSlot: '09:00 - 11:00',
    room: 'Lab A - Discovery Arena',
    maxCapacity: 12
  },
  {
    id: 'grp-ard-sat-pm',
    name: 'Makers Electronics - Beta',
    description: 'Breadboarding, circuit physics, ultrasonic sensors, actuators, and C++/MicroPython programming on Arduino and ESP32 boards.',
    pricePerMonth: 95,
    trainerIds: ['tr-1'],
    dayOfWeek: 'Saturday',
    timeSlot: '14:00 - 16:30',
    room: 'Lab B - Circuitry Workshop',
    maxCapacity: 10
  },
  {
    id: 'grp-ai-sun-am',
    name: 'AI & Python Explorers',
    description: 'Game design with Python, computer vision with OpenCV, and training kid-friendly machine learning neural models to recognize gestures.',
    pricePerMonth: 110,
    trainerIds: ['tr-3'],
    dayOfWeek: 'Sunday',
    timeSlot: '10:00 - 12:30',
    room: 'Lab C - Computing Suite',
    maxCapacity: 12
  },
  {
    id: 'grp-comp-wed-pm',
    name: 'National Championship Team',
    description: 'Intensive team training for national and international STEM Olympiads (WRO, First Lego League, National Robotics Cup).',
    pricePerMonth: 125,
    trainerIds: ['tr-1'],
    dayOfWeek: 'Wednesday',
    timeSlot: '16:30 - 19:30',
    room: 'Lab A - Competition Mat Area',
    maxCapacity: 8
  }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-101',
    studentName: 'Yassine Khelifi',
    studentAge: 8,
    parentName: 'Sonia Khelifi',
    parentPhone: '+216 98 441 223',
    parentEmail: 'sonia.khelifi@gmail.com',
    status: 'accepted',
    registeredAt: '2026-09-01',
    groupIds: ['grp-rob-sat-am'],
    standardMonthlyPrice: 85,
    paymentStatus: 'paid',
    notes: 'Very curious with gears. Works well in pairs.'
  },
  {
    id: 'std-102',
    studentName: 'Aya Ben Salah',
    studentAge: 8,
    parentName: 'Mohamed Ben Salah',
    parentPhone: '+216 52 110 334',
    parentEmail: 'm.bensalah@outlook.com',
    status: 'accepted',
    registeredAt: '2026-09-02',
    groupIds: ['grp-rob-sat-am'],
    standardMonthlyPrice: 85,
    customMonthlyPrice: 75, // sibling discount override
    paymentStatus: 'paid',
    notes: 'Sibling enrolled in AI squad. Sibling discount applied.'
  },
  {
    id: 'std-103',
    studentName: 'Adam Rezgui',
    studentAge: 12,
    parentName: 'Farid Rezgui',
    parentPhone: '+216 23 889 001',
    parentEmail: 'farid.rezgui@gmail.com',
    status: 'accepted',
    registeredAt: '2026-09-05',
    groupIds: ['grp-ard-sat-pm'],
    standardMonthlyPrice: 95,
    paymentStatus: 'paid',
    notes: 'Loves building custom sensor circuits.'
  },
  {
    id: 'std-104',
    studentName: 'Maya Trabelsi',
    studentAge: 11,
    parentName: 'Ines Trabelsi',
    parentPhone: '+216 99 771 882',
    parentEmail: 'ines.tr@gmail.com',
    status: 'accepted',
    registeredAt: '2026-09-06',
    groupIds: ['grp-ard-sat-pm'],
    standardMonthlyPrice: 95,
    paymentStatus: 'pending',
    notes: 'Pending payment validation for October.'
  },
  {
    id: 'std-105',
    studentName: 'Fares Gharbi',
    studentAge: 13,
    parentName: 'Taoufik Gharbi',
    parentPhone: '+216 24 556 778',
    parentEmail: 'taoufik.gharbi@yahoo.fr',
    status: 'accepted',
    registeredAt: '2026-09-08',
    groupIds: ['grp-ai-sun-am'],
    standardMonthlyPrice: 110,
    paymentStatus: 'paid',
    notes: 'High aptitude for logic and Python loops.'
  },
  {
    id: 'std-106',
    studentName: 'Lina Bouazizi',
    studentAge: 14,
    parentName: 'Hela Bouazizi',
    parentPhone: '+216 50 332 119',
    parentEmail: 'hela.b@gmail.com',
    status: 'accepted',
    registeredAt: '2026-09-04',
    groupIds: ['grp-comp-wed-pm'],
    standardMonthlyPrice: 125,
    customMonthlyPrice: 100, // merit scholarship
    paymentStatus: 'scholarship',
    notes: 'Club competitive squad captain - STEM merit scholarship.'
  },
  // Waitlist students
  {
    id: 'std-201',
    studentName: 'Rayen Cherif',
    studentAge: 7,
    parentName: 'Kmar Cherif',
    parentPhone: '+216 97 122 344',
    parentEmail: 'kmar.cherif@gmail.com',
    status: 'waitlist',
    groupIds: [],
    registeredAt: '2026-09-26',
    standardMonthlyPrice: 85,
    paymentStatus: 'pending',
    notes: 'Interested in Saturday morning slot.'
  },
  {
    id: 'std-202',
    studentName: 'Kenzy Ayari',
    studentAge: 10,
    parentName: 'Bilel Ayari',
    parentPhone: '+216 26 990 112',
    parentEmail: 'bilel.ayari@gmail.com',
    status: 'waitlist',
    groupIds: [],
    registeredAt: '2026-09-28',
    standardMonthlyPrice: 95,
    paymentStatus: 'pending',
    notes: 'Awaiting opening for weekend afternoon.'
  },
  {
    id: 'std-203',
    studentName: 'Sarra Chaabane',
    studentAge: 12,
    parentName: 'Monia Chaabane',
    parentPhone: '+216 58 443 221',
    parentEmail: 'monia.ch@gmail.com',
    status: 'accepted',
    groupIds: [],
    registeredAt: '2026-09-27',
    standardMonthlyPrice: 110,
    paymentStatus: 'pending',
    notes: 'Admitted, pending group schedule assignment.'
  }
];

// Starts inactive: nothing is shown to parents or visitors until the admin puts it on sale
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-club-hoodie',
    name: 'Official Club Hoodie',
    category: 'hoodie',
    description: 'The signature dark navy & burgundy hoodie worn by our Eurobot champions and Saturday makers.',
    price: 32,
    imageUrl: '',
    sizes: ['6-8Y', '8-10Y', '10-12Y', '12-14Y', 'S', 'M', 'L'],
    stock: { '6-8Y': 14, '8-10Y': 18, '10-12Y': 12, '12-14Y': 8, S: 15, M: 9, L: 5 },
    isActive: false,
    createdAt: '2026-09-01T00:00:00.000Z'
  }
];

export const INITIAL_ORDERS: ProductOrder[] = [
  {
    id: 'hd-01',
    productId: 'prod-club-hoodie',
    productName: 'Official Club Hoodie',
    studentId: 'std-101',
    studentName: 'Yassine Khelifi',
    parentName: 'Sonia Khelifi',
    size: '8-10Y',
    status: 'picked_up',
    requestedAt: '2026-09-12',
    pickedUpAt: '2026-09-19',
    price: 32
  },
  {
    id: 'hd-02',
    productId: 'prod-club-hoodie',
    productName: 'Official Club Hoodie',
    studentId: 'std-103',
    studentName: 'Adam Rezgui',
    parentName: 'Farid Rezgui',
    size: '12-14Y',
    status: 'ready',
    requestedAt: '2026-09-22',
    price: 32
  },
  {
    id: 'hd-03',
    productId: 'prod-club-hoodie',
    productName: 'Official Club Hoodie',
    studentId: 'std-106',
    studentName: 'Lina Bouazizi',
    parentName: 'Hela Bouazizi',
    size: 'S',
    status: 'picked_up',
    requestedAt: '2026-09-10',
    pickedUpAt: '2026-09-15',
    price: 32
  },
  {
    id: 'hd-04',
    productId: 'prod-club-hoodie',
    productName: 'Official Club Hoodie',
    studentId: 'std-105',
    studentName: 'Fares Gharbi',
    parentName: 'Taoufik Gharbi',
    size: '12-14Y',
    status: 'requested',
    requestedAt: '2026-09-29',
    price: 32
  }
];

export const INITIAL_SESSIONS: SessionRecord[] = [
  {
    id: 'sess-01',
    groupId: 'grp-rob-sat-am',
    date: '2026-09-27',
    weekNumber: 3,
    topicTaught: 'Autonomous Maze Navigation & Ultrasonic Echo Avoidance',
    isSyllabusValidated: true,
    validatedAt: '2026-09-27 11:15',
    trainerNotes: 'All students succeeded in avoiding the obstacle cardboard box. Adam and Aya showed great teamwork.',
    records: {
      'std-101': {
        studentId: 'std-101',
        status: 'present',
        rating: 18,
        pedagogicalRemark: 'Outstanding focus on calibration of optical sensor. Completed bonus challenge.'
      },
      'std-102': {
        studentId: 'std-102',
        status: 'present',
        rating: 15,
        pedagogicalRemark: 'Great curiosity. Understood motor speed differential turns quickly.'
      }
    }
  },
  {
    id: 'sess-02',
    groupId: 'grp-ard-sat-pm',
    date: '2026-09-27',
    weekNumber: 3,
    topicTaught: 'Servo Motors & Robotic Claws Control',
    isSyllabusValidated: true,
    validatedAt: '2026-09-27 16:45',
    trainerNotes: 'Covered PWM pulse modulation and analog potentiometer feedback.',
    records: {
      'std-103': {
        studentId: 'std-103',
        status: 'present',
        rating: 18,
        pedagogicalRemark: 'Built a 2-axis robotic arm claw. Calibrated zero angle accurately.'
      },
      'std-104': {
        studentId: 'std-104',
        status: 'late',
        rating: 15,
        pedagogicalRemark: 'Arrived 15m late due to traffic, quickly caught up with wiring diagram.'
      }
    }
  }
];

export const INITIAL_MATERIAL_REQUESTS: MaterialRequest[] = [
  {
    id: 'mat-01',
    trainerId: 'tr-1',
    trainerName: 'Karim Ben Salem',
    groupId: 'grp-ard-sat-pm',
    groupName: 'Makers Electronics - Beta',
    itemsNeeded: '10x SG90 Micro Servos + 5x Breadboard Jumpers Packs',
    quantity: '15 units',
    urgency: 'medium',
    status: 'delivered',
    requestedAt: '2026-09-24',
    sessionDate: '2026-09-27'
  },
  {
    id: 'mat-02',
    trainerId: 'tr-3',
    trainerName: 'Youssef Trabelsi',
    groupId: 'grp-ai-sun-am',
    groupName: 'AI & Python Explorers',
    itemsNeeded: '4x Wide-angle HD USB Webcams for OpenCV Computer Vision Lab',
    quantity: '4 units',
    urgency: 'urgent',
    status: 'approved',
    requestedAt: '2026-09-29',
    sessionDate: '2026-10-04'
  }
];





/**
 * Default numbers offered in Admin → Landing page. 0 = not set: the counter is hidden on the
 * home page until an admin enters the real figure.
 */
export const CLUB_STATS = {
  activeStudents: 0,
  workshopsCompleted: 0,
  projectsBuilt: 0,
  competitionsWon: 0
};

// The hall of fame lives in src/data/siteContent.ts (achievements)
