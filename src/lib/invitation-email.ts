import nodemailer from "nodemailer";

const roleLabel = { admin: "Administrador", coordinator: "Coordinador", operator: "Operador", reviewer: "Revisor", viewer: "Consulta" } as const;
const clean = (value: string) => value.replace(/[\r\n]+/g, " ").trim();
const esc = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Gmail only delivers mail sent from the authenticated account, so the sender is GMAIL_USER and the
// admin who invites appears as the display name and Reply-To (replies go straight to them).
export async function sendInvitationEmail(o: { to: string; adminName: string; adminEmail: string; teamName: string; role: keyof typeof roleLabel; link: string }) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("falta configurar GMAIL_USER y GMAIL_APP_PASSWORD");
  const admin = clean(o.adminName), team = clean(o.teamName), role = roleLabel[o.role];
  const text = `${admin} (${o.adminEmail}) te invitó al equipo "${team}" en CotizaPro con el rol de ${role}.\n\nEntra con este mismo correo (${o.to}) usando "Continuar con Google":\n${o.link}\n\nEl enlace vence en 7 días. Si no esperabas esta invitación, ignora este mensaje.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;color:#1c2927"><h2 style="margin:0 0 12px">Te invitaron a CotizaPro</h2><p><b>${esc(admin)}</b> (${esc(o.adminEmail)}) te invitó al equipo <b>${esc(team)}</b> con el rol de <b>${role}</b>.</p><p><a href="${esc(o.link)}" style="display:inline-block;background:#237461;color:#fff;padding:12px 20px;border-radius:7px;text-decoration:none;font-weight:bold">Aceptar invitación</a></p><p style="color:#6e7d7a;font-size:13px">Entra con este mismo correo (${esc(o.to)}) usando «Continuar con Google». El enlace vence en 7 días. Si no esperabas esta invitación, ignora este mensaje.</p></div>`;
  await nodemailer.createTransport({ service: "gmail", auth: { user, pass } }).sendMail({
    from: { name: `${admin} (CotizaPro)`, address: user },
    replyTo: { name: admin, address: o.adminEmail },
    to: o.to,
    subject: `${admin} te invitó a ${team} en CotizaPro`,
    text,
    html,
  });
}
