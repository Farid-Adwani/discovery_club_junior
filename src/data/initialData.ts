import { Program, Trainer, Group, Student, HoodieSize, HoodieDistribution, SessionRecord, MaterialRequest, ClubEvent, FacebookPost, AppUser } from '../types';

export const INITIAL_PROGRAMS: Program[] = [
  {
    id: 'prog-robotics-starter',
    title: 'Junior Robotics Explorer',
    ageRange: '6 - 9 years',
    description: 'Foundational tactile engineering, gear ratios, kinetic mechanisms, and visual block logic using LEGO Education & modular rover kits.',
    level: 'Beginner',
    pricePerMonth: 85,
    duration: '9 Months (Weekly 2h)',
    badge: 'Robotics',
    syllabus: [
      { week: 1, title: 'Mechanics & Motors', description: 'Understanding spur gears, axles, and mechanical torque.', hardware: 'Lego Spike Prime Essentials' },
      { week: 2, title: 'Color & Distance Sensors', description: 'Teaching rovers to detect obstacle barriers and follow colored paths.', hardware: 'Optical Sensors & Hub' },
      { week: 3, title: 'Autonomous Maze Navigation', description: 'Programming decision loops and obstacle avoidance algorithms.', hardware: 'Twin Motor Smart Chassis' },
      { week: 4, title: 'Rescue Bot Challenge', description: 'Mini-hackathon: rescue payload without dropping cargo.', hardware: 'Full Robotics Starter Kit' }
    ]
  },
  {
    id: 'prog-arduino-makers',
    title: 'Electronics & Microcontrollers Lab',
    ageRange: '10 - 14 years',
    description: 'Breadboarding, circuit physics, ultrasonic sensors, actuators, and C++/MicroPython programming on Arduino and ESP32 boards.',
    level: 'Intermediate',
    pricePerMonth: 95,
    duration: '9 Months (Weekly 2.5h)',
    badge: 'Electronics & Code',
    syllabus: [
      { week: 1, title: 'Ohm’s Law & Breadboard Prototyping', description: 'Resistors, LEDs, pull-up buttons, and basic circuit loop safety.', hardware: 'Arduino Uno R4 + Breadboards' },
      { week: 2, title: 'Analog vs Digital Inputs', description: 'Reading pot potentiometers, photoresistors, and PWM pulse modulation.', hardware: 'Analog Sensor Pack' },
      { week: 3, title: 'Servo Motors & Robotic Claws', description: 'Writing custom angular trajectory functions and button-driven grabbers.', hardware: 'Micro-servos SG90' },
      { week: 4, title: 'Smart Home Automation Node', description: 'Interfacing temperature sensors and buzzer alert subsystems.', hardware: 'DHT11 + Piezo Elements' }
    ]
  },
  {
    id: 'prog-ai-python',
    title: 'Creative Coding & Kids AI',
    ageRange: '11 - 16 years',
    description: 'Game design with Python, computer vision with OpenCV, and training kid-friendly machine learning neural models to recognize gestures.',
    level: 'Advanced',
    pricePerMonth: 110,
    duration: '9 Months (Weekly 2.5h)',
    badge: 'AI & Python',
    syllabus: [
      { week: 1, title: 'Python Fundamentals for Makers', description: 'Variables, loops, functions, and algorithmic game math.', hardware: 'Workstation Terminals' },
      { week: 2, title: 'Computer Vision & Webcam Tracking', description: 'Detecting hand coordinates and building virtual air-pianos.', hardware: 'HD Camera Modules' },
      { week: 3, title: 'Teachable Machine & Classifier Models', description: 'Training gesture detection models and deploying onto micro-logic.', hardware: 'Edge AI Accelerators' },
      { week: 4, title: 'Autonomous Rover Line Follower AI', description: 'Camera-guided vision tracker for racetrack navigation.', hardware: 'Raspberry Pi Rover' }
    ]
  },
  {
    id: 'prog-competitive-robotics',
    title: 'Competitive Robotics Championship Squad',
    ageRange: '12 - 17 years',
    description: 'Intensive team training for national and international STEM Olympiads (WRO, First Lego League, National Robotics Cup).',
    level: 'Competitive',
    pricePerMonth: 125,
    duration: 'Full Season Prep (Weekly 3h)',
    badge: 'Competition Team',
    syllabus: [
      { week: 1, title: 'Competition Arena Rules & Precision PID', description: 'PID control loops for high-speed millimeter line alignment.', hardware: 'Tournament Certified Mats' },
      { week: 2, title: 'High-Speed Gearboxes & Dual Grippers', description: 'CAD modeling and rapid prototyping custom mission appendages.', hardware: '3D Printers & Metal Gears' },
      { week: 3, title: 'Mission Strategy & Time Runs', description: 'Simulated 2-minute competitive runs and failure recovery routines.', hardware: 'Official Competition Field' },
      { week: 4, title: 'Scrimmage & Engineering Log Review', description: 'Peer defense simulation and technical interview rehearsals.', hardware: 'Team Pitch Stage' }
    ]
  }
];

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
    programId: 'prog-robotics-starter',
    trainerId: 'tr-2',
    dayOfWeek: 'Saturday',
    timeSlot: '09:00 - 11:00',
    room: 'Lab A - Discovery Arena',
    maxCapacity: 12
  },
  {
    id: 'grp-ard-sat-pm',
    name: 'Makers Electronics - Beta',
    programId: 'prog-arduino-makers',
    trainerId: 'tr-1',
    dayOfWeek: 'Saturday',
    timeSlot: '14:00 - 16:30',
    room: 'Lab B - Circuitry Workshop',
    maxCapacity: 10
  },
  {
    id: 'grp-ai-sun-am',
    name: 'AI & Python Explorers',
    programId: 'prog-ai-python',
    trainerId: 'tr-3',
    dayOfWeek: 'Sunday',
    timeSlot: '10:00 - 12:30',
    room: 'Lab C - Computing Suite',
    maxCapacity: 12
  },
  {
    id: 'grp-comp-wed-pm',
    name: 'National Championship Team',
    programId: 'prog-competitive-robotics',
    trainerId: 'tr-1',
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
    programId: 'prog-robotics-starter',
    status: 'active',
    registeredAt: '2026-09-01',
    groupId: 'grp-rob-sat-am',
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
    programId: 'prog-robotics-starter',
    status: 'active',
    registeredAt: '2026-09-02',
    groupId: 'grp-rob-sat-am',
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
    programId: 'prog-arduino-makers',
    status: 'active',
    registeredAt: '2026-09-05',
    groupId: 'grp-ard-sat-pm',
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
    programId: 'prog-arduino-makers',
    status: 'active',
    registeredAt: '2026-09-06',
    groupId: 'grp-ard-sat-pm',
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
    programId: 'prog-ai-python',
    status: 'active',
    registeredAt: '2026-09-08',
    groupId: 'grp-ai-sun-am',
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
    programId: 'prog-competitive-robotics',
    status: 'active',
    registeredAt: '2026-09-04',
    groupId: 'grp-comp-wed-pm',
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
    programId: 'prog-robotics-starter',
    status: 'waitlist',
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
    programId: 'prog-arduino-makers',
    status: 'waitlist',
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
    programId: 'prog-ai-python',
    status: 'accepted',
    registeredAt: '2026-09-27',
    standardMonthlyPrice: 110,
    paymentStatus: 'pending',
    notes: 'Admitted, pending group schedule assignment.'
  }
];

export const INITIAL_HOODIE_STOCK: Record<HoodieSize, number> = {
  '6-8Y': 14,
  '8-10Y': 18,
  '10-12Y': 12,
  '12-14Y': 8,
  'S': 15,
  'M': 9,
  'L': 5
};

export const INITIAL_HOODIE_DISTRIBUTIONS: HoodieDistribution[] = [
  {
    id: 'hd-01',
    studentId: 'std-101',
    studentName: 'Yassine Khelifi',
    parentName: 'Sonia Khelifi',
    size: '8-10Y',
    isPersonalized: true,
    personalizedText: 'Yassine #01',
    status: 'picked_up',
    requestedAt: '2026-09-12',
    pickedUpAt: '2026-09-19',
    price: 38
  },
  {
    id: 'hd-02',
    studentId: 'std-103',
    studentName: 'Adam Rezgui',
    parentName: 'Farid Rezgui',
    size: '12-14Y',
    isPersonalized: true,
    personalizedText: 'Adam Maker',
    status: 'ready',
    requestedAt: '2026-09-22',
    price: 38
  },
  {
    id: 'hd-03',
    studentId: 'std-106',
    studentName: 'Lina Bouazizi',
    parentName: 'Hela Bouazizi',
    size: 'S',
    isPersonalized: false,
    status: 'picked_up',
    requestedAt: '2026-09-10',
    pickedUpAt: '2026-09-15',
    price: 32
  },
  {
    id: 'hd-04',
    studentId: 'std-105',
    studentName: 'Fares Gharbi',
    parentName: 'Taoufik Gharbi',
    size: '12-14Y',
    isPersonalized: false,
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
        rating: 5,
        pedagogicalRemark: 'Outstanding focus on calibration of optical sensor. Completed bonus challenge.'
      },
      'std-102': {
        studentId: 'std-102',
        status: 'present',
        rating: 4,
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
        rating: 5,
        pedagogicalRemark: 'Built a 2-axis robotic arm claw. Calibrated zero angle accurately.'
      },
      'std-104': {
        studentId: 'std-104',
        status: 'late',
        rating: 4,
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

export const INITIAL_EVENTS: ClubEvent[] = [
  {
    id: 'evt-01',
    title: 'National Junior Robotics Olympiad 2026',
    category: 'Competition',
    date: 'October 24, 2026',
    time: '09:00 - 18:00',
    location: 'Palais des Congrès, Tunis',
    description: 'Premier national challenge where junior robotics squads compete in precision maze solving and autonomous payload deliveries.',
    spotsLeft: 12,
    isRegistered: false
  },
  {
    id: 'evt-02',
    title: 'Junior AI & Game Hackathon: 48h Challenge',
    category: 'Hackathon',
    date: 'November 14, 2026',
    time: '10:00 - 17:00',
    location: 'Discovery Club Junior Innovation Arena',
    description: 'Fun coding hackathon where teams of 3 build eco-friendly smart city simulations and games in Python & Scratch.',
    spotsLeft: 18,
    isRegistered: true
  },
  {
    id: 'evt-03',
    title: 'Autumn STEM Maker Exhibition & Parent Demo Day',
    category: 'Exhibition',
    date: 'December 05, 2026',
    time: '14:00 - 18:30',
    location: 'Discovery Club Junior Main Campus',
    description: 'Students demonstrate their functional robots, electronic gadgets, and software to parents, mentors, and industry guests.',
    spotsLeft: 45,
    isRegistered: false
  }
];

export const FACEBOOK_POSTS: FacebookPost[] = [
  {
    id: 'fb-01',
    caption: '🏆 HISTORIC VICTORY! Our "Discovery 2" team wins 1st PLACE WORLDWIDE at Eurobot Junior 2026 in Alcalá de Henares, Spain! 🇹🇳 Outperforming 31 teams from 17 nations with our autonomous obstacle rover. Immense pride for our young Tunisian engineers!',
    date: '3 days ago',
    imageUrl: '/src/assets/images/eurobot_junior_victory_1790791215153.jpg',
    likes: 482,
    comments: 94,
    tag: 'Eurobot Junior Champion',
    postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
  },
  {
    id: 'fb-02',
    caption: '⚡ Saturday Morning in Manouba Lab: Our 10-14 year olds mastering Arduino Uno microcontrollers, ultrasonic echo sensor triangulation, and DC motor PWM control! Prototyping autonomous line followers with passion.',
    date: '5 days ago',
    imageUrl: '/src/assets/images/facebook_arduino_lab_1790791225683.jpg',
    likes: 310,
    comments: 42,
    tag: 'Makers Workshop',
    postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
  },
  {
    id: 'fb-03',
    caption: '🤖 "Trial and error is the mother of engineering." Look at our Junior Robotics Alpha squad collaborating on dual-gripper pick-and-place robots! Ready for the upcoming National Cup.',
    date: '1 week ago',
    imageUrl: '/src/assets/images/hero_robotics_club_1790790599599.jpg',
    likes: 275,
    comments: 31,
    tag: 'Junior Robotics',
    postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
  },
  {
    id: 'fb-04',
    caption: '💻 AI & Python cohort training computer vision models! Today students used OpenCV and Python to track hand coordinates in real time. The future of robotics is intelligent software.',
    date: '2 weeks ago',
    imageUrl: '/src/assets/images/coding_stem_workshop_1790790611938.jpg',
    likes: 240,
    comments: 28,
    tag: 'AI for Kids',
    postUrl: 'https://www.facebook.com/DiscoveryClubJunior/'
  }
];

export const PRESET_ACCOUNTS: AppUser[] = [
  {
    uid: 'usr-admin-01',
    email: 'faridadwani2000@gmail.com',
    displayName: 'Farid Adwani (Club Director)',
    role: 'admin',
    roles: ['admin', 'trainer', 'parent', 'visitor'],
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    uid: 'usr-trainer-01',
    email: 'k.bensalem@discoveryclubjunior.org',
    displayName: 'Karim Ben Salem (Lead Trainer)',
    role: 'trainer',
    roles: ['trainer', 'visitor'],
    trainerId: 'tr-1',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    uid: 'usr-parent-01',
    email: 'sonia.khelifi@gmail.com',
    displayName: 'Sonia Khelifi (Parent)',
    role: 'parent',
    roles: ['parent', 'visitor'],
    studentId: 'std-101',
    photoURL: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  }
];


export const CLUB_STATS = {
  activeStudents: 148,
  workshopsCompleted: 320,
  projectsBuilt: 610,
  competitionsWon: 14,
  parentSatisfactionRate: 98.6
};

export const CLUB_ACHIEVEMENTS_TIMELINE = [
  {
    year: '2021',
    title: 'Foundation of Discovery Club Junior',
    description: 'Started as a weekend maker garage with 12 enthusiastic kids and 6 robotics starter kits.'
  },
  {
    year: '2023',
    title: 'National Robotics Cup Champions',
    description: 'Our junior squad won 1st place in the Autonomous Rover Category against 40 regional academies.'
  },
  {
    year: '2024',
    title: 'STEM Pedagogy Accreditation',
    description: 'Curriculum certified with international hands-on constructivist standards, introducing AI for young coders.'
  },
  {
    year: '2025 - 2026',
    title: 'Expanded Maker Labs & Smart Campus',
    description: 'Over 140+ active young inventors, dedicated electronics cleanrooms, and official WRO tournament qualifiers.'
  }
];
