import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const emailService = process.env.EMAIL_SERVICE || "gmail";
  const emailUser    = process.env.EMAIL_USER;
  const emailPass    = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn("[email] EMAIL_USER o EMAIL_PASS no configurados — emails no se enviarán");
  }

  transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser || "",
      pass: emailPass || "",
    },
  });

  return transporter;
}

export async function enviarCorreo(
  destinatario: string,
  asunto: string,
  cuerpo: string
): Promise<void> {
  if (!process.env.EMAIL_USER) {
    console.warn("[email] EMAIL_USER no configurado — email no enviado");
    return;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: destinatario,
    subject: asunto,
    text: cuerpo,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[email] Correo enviado a ${destinatario}:`, info.response);
  } catch (error) {
    console.error("[email] Error al enviar correo:", (error as Error).message);
    throw error;
  }
}
