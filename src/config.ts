// Central place for third-party identifiers. EmailJS keys are public by design
// (they only authorise sending through pre-defined templates), but they can be
// overridden per environment through Vite env variables.
export const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID ?? 'service_dkng7ol',
  inviteTemplateId: import.meta.env.VITE_EMAILJS_INVITE_TEMPLATE ?? 'template_picgzcg',
  sosTemplateId: import.meta.env.VITE_EMAILJS_SOS_TEMPLATE ?? 'template_o1iokwt',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? 'ikmstn4Jj0VVM1gWD'
};

export const MAX_NOTE_LENGTH = 500;
