/**
 * ESTUDIO — api/contact.js
 * Tecnología: Node.js + Express (o Vercel Serverless Function)
 * Scope: Endpoint POST /api/contact para procesar el formulario
 *        y enviar emails usando Resend (resend.com — plan gratis disponible).
 *
 * INSTRUCCIONES DE USO:
 *
 * 1. Instalar dependencias:
 *      npm install express resend cors dotenv
 *
 * 2. Crear archivo .env en la raíz:
 *      RESEND_API_KEY=re_xxxxxxxxxxxx
 *      CONTACT_EMAIL=hola@tu-dominio.com
 *      PORT=3000
 *
 * 3. Obtener API key gratuita en resend.com
 *
 * 4. Correr el servidor:
 *      node server.js
 *
 * ALTERNATIVA SIN SERVIDOR (recomendada para empezar):
 *   Usar Formspree (formspree.io) o Netlify Forms.
 *   Ver comentarios en index.html, sección CONTACTO.
 */

'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Handler principal — compatible con Express y Vercel Serverless.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function contactHandler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, type, message } = req.body;

  // Validación mínima del lado servidor
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  // Sanitización básica (prevenir XSS en el contenido del email)
  const sanitize = (str = '') =>
    String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 2000);

  const projectTypes = {
    residencial:    'Residencial',
    comercial:      'Comercial',
    institucional:  'Institucional',
    reforma:        'Reforma / Remodelación',
    consulta:       'Consulta técnica',
  };
  const projectLabel = projectTypes[type] || type || 'Sin especificar';

  try {
    // Envío del email de notificación al estudio
    const { error } = await resend.emails.send({
      from:    'Formulario web <noreply@tu-dominio.com>', // debe ser dominio verificado en Resend
      to:      [process.env.CONTACT_EMAIL || 'hola@estudio-arq.com'],
      replyTo: email,
      subject: `Nueva consulta de ${sanitize(name)} — ${projectLabel}`,
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #888; margin-bottom: 24px;">
            Consulta desde estudio-arq.com
          </p>
          <h2 style="font-size: 24px; font-weight: 300; margin-bottom: 32px; border-bottom: 1px solid #eaeaea; padding-bottom: 16px;">
            ${sanitize(name)}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 0; color: #888; width: 140px;">Email</td>
              <td style="padding: 10px 0;"><a href="mailto:${sanitize(email)}">${sanitize(email)}</a></td>
            </tr>
            <tr style="border-top: 1px solid #eaeaea;">
              <td style="padding: 10px 0; color: #888;">Tipo de proyecto</td>
              <td style="padding: 10px 0;">${sanitize(projectLabel)}</td>
            </tr>
            <tr style="border-top: 1px solid #eaeaea;">
              <td style="padding: 10px 0; color: #888; vertical-align: top;">Mensaje</td>
              <td style="padding: 10px 0; line-height: 1.6;">${sanitize(message).replace(/\n/g, '<br/>')}</td>
            </tr>
          </table>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend Error]', error);
      return res.status(500).json({ error: 'Error al enviar el mensaje. Intentá de nuevo.' });
    }

    // Email de confirmación al cliente
    await resend.emails.send({
      from:    'Estudio.Arq <hola@tu-dominio.com>',
      to:      [email],
      subject: 'Recibimos tu consulta — Estudio.Arq',
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <p style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #888; margin-bottom: 32px;">
            Estudio.Arq · Buenos Aires
          </p>
          <p style="font-size: 22px; font-weight: 300; line-height: 1.4; margin-bottom: 24px;">
            Hola ${sanitize(name)},
          </p>
          <p style="color: #555; line-height: 1.7;">
            Recibimos tu consulta sobre un proyecto <strong>${sanitize(projectLabel).toLowerCase()}</strong>.
            Vamos a revisar el detalle y te respondemos en un plazo de 48 horas hábiles.
          </p>
          <p style="color: #555; line-height: 1.7; margin-top: 16px;">
            Mientras tanto, podés ver nuestra obra reciente en
            <a href="https://estudio-arq.com/#proyectos" style="color: #111;">estudio-arq.com</a>.
          </p>
          <p style="margin-top: 48px; color: #888; font-size: 13px; border-top: 1px solid #eaeaea; padding-top: 24px;">
            Estudio.Arq · Av. Santa Fe 2450, piso 8, Buenos Aires
          </p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true, message: 'Mensaje enviado correctamente.' });

  } catch (err) {
    console.error('[Contact API Error]', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}

module.exports = contactHandler;