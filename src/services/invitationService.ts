import { doc, setDoc } from 'firebase/firestore';
import emailjs from '@emailjs/browser';
import { db } from './firebase';
import { EMAILJS } from '../config';

export interface InvitationInput {
  email: string;
  role: 'DRIVER' | 'MANAGER';
  driverId?: string;
  adminId?: string;
}

// The invitation document is keyed by the lower-cased e-mail so that
// firestore.rules can find it without a query. The random token proves that
// the person claiming it received the e-mail.
export async function createInvitation(input: InvitationInput): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const token = crypto.randomUUID();

  await setDoc(doc(db, 'invitations', email), {
    email,
    role: input.role,
    driverId: input.driverId ?? '',
    adminId: input.adminId ?? '',
    token,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  const params = new URLSearchParams({ email, token, role: input.role === 'DRIVER' ? 'driver' : 'admin' });
  if (input.driverId) params.set('driver', input.driverId);
  if (input.adminId) params.set('admin', input.adminId);
  return `${window.location.origin}/activate?${params.toString()}`;
}

export async function sendInvitationEmail(email: string, link: string): Promise<void> {
  await emailjs.send(EMAILJS.serviceId, EMAILJS.inviteTemplateId, { email, link }, EMAILJS.publicKey);
}
