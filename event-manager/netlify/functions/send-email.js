// netlify/functions/send-email.js
const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, message: "Method not allowed" }),
      };
    }

    const { to, subject, body, fromName, fromEmail } = JSON.parse(
      event.body || "{}"
    );

    if (!to || !subject || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Campos obrigatórios: to, subject, body",
        }),
      };
    }

    // Lê variáveis de ambiente da Netlify
    const user = process.env.SMTP_USERNAME || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.error("Faltam credenciais SMTP nas env vars");
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          message: "Configuração SMTP em falta no servidor",
        }),
      };
    }

    // Transport para Gmail com app password
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: true, // 465 = TLS direto
      auth: {
        user,
        pass,
      },
    });

    const fromAddress = fromEmail || process.env.SMTP_FROM || user;

    await transporter.sendMail({
      from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Email enviado com sucesso",
      }),
    };
  } catch (error) {
    console.error("Erro no envio de email:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: error.message || "Erro ao enviar email",
      }),
    };
  }
};
