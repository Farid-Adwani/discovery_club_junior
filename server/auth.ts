import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, db } from './firebaseAdmin';
import type { AppUser, UserRole } from '../src/types';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'faridadwani2000@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface AuthedRequest extends Request {
  user?: AppUser;
  token?: DecodedIdToken;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Works out who the caller is. Roles are never taken from the browser:
 *  - admin:   verified email listed in ADMIN_EMAILS
 *  - trainer: verified email matching a document in `trainers`
 *  - parent:  everyone else (children are linked through students.parentUid)
 */
export async function resolveProfile(token: DecodedIdToken): Promise<AppUser> {
  const email = (token.email || '').toLowerCase();
  const verified = token.email_verified === true;

  const userSnap = await db.collection('users').doc(token.uid).get();
  const stored = userSnap.exists ? userSnap.data() || {} : {};

  const base = {
    uid: token.uid,
    email,
    displayName: stored.displayName || token.name || email.split('@')[0] || 'Discovery Member',
    photoURL: token.picture
  };

  if (verified && ADMIN_EMAILS.includes(email)) {
    const roles: UserRole[] = ['admin', 'trainer', 'parent', 'visitor'];
    return { ...base, role: 'admin', roles };
  }

  if (verified && email) {
    const trainerSnap = await db.collection('trainers').where('email', '==', email).limit(1).get();
    if (!trainerSnap.empty) {
      return { ...base, role: 'trainer', roles: ['trainer', 'visitor'], trainerId: trainerSnap.docs[0].id };
    }
  }

  const studentIds: string[] = stored.studentIds || [];
  return {
    ...base,
    role: 'parent',
    roles: ['parent', 'visitor'],
    studentIds,
    studentId: studentIds[0],
    parentPhone: stored.parentPhone
  };
}

/** Reads the Firebase ID token if present. Requests without one are treated as public visitors. */
export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = await adminAuth.verifyIdToken(header.slice(7));
      req.token = token;
      req.user = await resolveProfile(token);
    } catch {
      // Invalid or expired token: continue as an anonymous visitor
    }
  }
  next();
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in first.' });
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in first.' });
    if (!roles.some((r) => req.user!.roles.includes(r))) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}
