import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({ from: config.email.from, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('Email send error', err);
  }
};

export const sendVerificationEmail = (to: string, token: string) =>
  sendEmail(
    to,
    'Vérifiez votre compte — Dynamique RDC',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#DC2626">Dynamique Israël Mutombo</h2>
      <p>Merci de votre inscription à la plateforme citoyenne.</p>
      <p>Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :</p>
      <a href="${config.frontendUrl}/verify-email?token=${token}"
         style="background:#DC2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
        Vérifier mon compte
      </a>
      <p style="color:#666;font-size:12px">Ce lien expire dans 24 heures.</p>
      <hr/>
      <p style="color:#666;font-size:12px">Unité · Résistance · Discipline · Loyauté · Engagement</p>
    </div>`
  );

export const sendPasswordResetEmail = (to: string, token: string) =>
  sendEmail(
    to,
    'Réinitialisation mot de passe — Dynamique RDC',
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#DC2626">Dynamique Israël Mutombo</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <a href="${config.frontendUrl}/reset-password?token=${token}"
         style="background:#DC2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
        Réinitialiser mon mot de passe
      </a>
      <p style="color:#666;font-size:12px">Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    </div>`
  );

export const sendAlertEmail = (to: string, title: string, body: string) =>
  sendEmail(
    to,
    `🚨 ALERTE — ${title}`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#DC2626">⚠️ ALERTE DYNAMIQUE RDC</h2>
      <h3>${title}</h3>
      <p>${body}</p>
      <a href="${config.frontendUrl}/alerts"
         style="background:#DC2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0">
        Voir sur la plateforme
      </a>
    </div>`
  );
