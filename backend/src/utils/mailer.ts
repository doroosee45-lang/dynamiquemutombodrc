import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host:   config.email.host,
  port:   config.email.port,
  secure: config.email.port === 465,
  auth: { user: config.email.user, pass: config.email.pass },
});

export const sendMail = async (
  to: string | string[],
  subject: string,
  html: string,
): Promise<boolean> => {
  if (!config.email.user) {
    logger.warn('Email non configuré — sendMail ignoré');
    return false;
  }
  try {
    await transporter.sendMail({
      from: config.email.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info(`Email envoyé à ${to}`);
    return true;
  } catch (err) {
    logger.error('Erreur envoi email', err);
    return false;
  }
};

/* ── Templates ─────────────────────────────────────────────────────── */

export const joinRequestHtml = (d: {
  fullName: string; firstName: string; email: string; phone: string;
  province: string; district?: string; commune?: string; quartier?: string;
  motivation: string; howKnown: string; skills?: string; availability?: string;
  dashboardUrl: string;
}) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6}
    .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
    .hd{background:linear-gradient(135deg,#dc2626,#991b1b);padding:32px 40px;text-align:center}
    .hd h1{color:#fff;font-size:22px;font-weight:900;margin-bottom:4px}
    .hd p{color:#fca5a5;font-size:13px}
    .bd{padding:32px 40px}
    .badge{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:20px}
    .title{font-size:18px;font-weight:900;color:#111;margin-bottom:20px}
    .row{display:flex;gap:12px;margin-bottom:12px}
    .cell{flex:1;background:#f9fafb;border-left:3px solid #dc2626;border-radius:8px;padding:12px 14px}
    .cell-label{font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:700;letter-spacing:.5px}
    .cell-val{font-size:14px;color:#111;font-weight:600;margin-top:3px}
    .divider{height:1px;background:#e5e7eb;margin:24px 0}
    .motiv-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:16px}
    .motiv-box p{font-size:14px;color:#374151;line-height:1.7}
    .cta{text-align:center;margin:28px 0 8px}
    .btn{display:inline-block;background:#dc2626;color:#fff;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px}
    .ft{background:#111827;padding:20px;text-align:center}
    .ft p{color:#6b7280;font-size:11px;margin-top:4px}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hd">
    <h1>Dynamique Israël Mutombo</h1>
    <p>Nouvelle demande d'adhésion reçue</p>
  </div>
  <div class="bd">
    <span class="badge">📋 En attente de validation</span>
    <p class="title">${d.fullName} ${d.firstName} souhaite rejoindre la Dynamique</p>

    <div class="row">
      <div class="cell"><div class="cell-label">Province</div><div class="cell-val">🗺️ ${d.province}</div></div>
      ${d.district ? `<div class="cell"><div class="cell-label">District</div><div class="cell-val">${d.district}</div></div>` : ''}
    </div>
    <div class="row">
      <div class="cell"><div class="cell-label">Email</div><div class="cell-val">${d.email}</div></div>
      <div class="cell"><div class="cell-label">Téléphone</div><div class="cell-val">${d.phone}</div></div>
    </div>
    ${d.commune ? `<div class="row"><div class="cell"><div class="cell-label">Commune / Territoire</div><div class="cell-val">${d.commune}</div></div></div>` : ''}

    <div class="divider"></div>

    <p style="font-size:13px;font-weight:700;color:#dc2626;margin-bottom:8px">💬 Motivation</p>
    <div class="motiv-box"><p>${d.motivation}</p></div>

    ${d.skills ? `<div class="row"><div class="cell"><div class="cell-label">Compétences</div><div class="cell-val">${d.skills}</div></div></div>` : ''}
    <div class="row"><div class="cell"><div class="cell-label">Comment a-t-il/elle connu la Dynamique ?</div><div class="cell-val">${d.howKnown}</div></div></div>
    ${d.availability ? `<div class="row"><div class="cell"><div class="cell-label">Disponibilité</div><div class="cell-val">${d.availability}</div></div></div>` : ''}

    <div class="cta">
      <a class="btn" href="${d.dashboardUrl}">Voir dans le dashboard →</a>
    </div>
  </div>
  <div class="ft">
    <p style="color:#9ca3af;font-size:12px">Dynamique Israël Mutombo · RDC · 2026</p>
    <p>Unité · Résistance · Discipline · Loyauté · Engagement</p>
  </div>
</div>
</body></html>`;
