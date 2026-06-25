import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Red Bull 24H <noreply@redbull24h.com.br>";
const BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

export const emailService = {
	async sendShareLink(to: string, athleteName: string, shareToken: string): Promise<void> {
		const link = `${BASE_URL}/share/athlete/${shareToken}`;

		const { error } = await resend.emails.send({
			from: FROM,
			to,
			subject: `${athleteName}, seu desempenho no Red Bull 24H está disponível!`,
			html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto;">
    <tr><td style="padding:32px 24px;background:#111;border-radius:16px;border:1px solid #222;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#fff;">
        Parabéns, ${athleteName}! 🏃
      </h1>
      <p style="font-size:15px;color:#aaa;margin:0 0 24px;line-height:1.5;">
        Sua participação no <strong style="color:#fff;">Red Bull 24H</strong> foi registrada.
        Acesse seu card de desempenho e compartilhe com amigos e nas redes sociais.
      </p>
      <a href="${link}"
         style="display:inline-block;background:#be0000;color:#fff;text-decoration:none;
                padding:14px 28px;border-radius:10px;font-size:15px;font-weight:700;">
        Ver meu desempenho
      </a>
      <p style="font-size:12px;color:#444;margin:24px 0 0;">
        Ou acesse: <a href="${link}" style="color:#666;">${link}</a>
      </p>
    </td></tr>
  </table>
</body>
</html>
			`.trim(),
		});
		if (error) throw new Error(error.message);
	},
};
