#!/usr/bin/env node
/**
 * Script de demo para apresentação.
 * Uso: node scripts/demo-emails.js
 *
 * Edite ATTENDEES abaixo com nome,email das pessoas do forms.
 * Roda com as credenciais do .env (SMTP_USER, SMTP_PASS, EMAIL_FROM, APP_BASE_URL).
 */

require("dotenv").config();
const nodemailer = require("nodemailer");

// ─── EDITE AQUI ──────────────────────────────────────────────────────────────
const BASE_URL = process.env.APP_BASE_URL || "https://SEU-APP.onrender.com";

// Cole aqui os dados do forms — só nome + email obrigatórios.
// equipe, km e pace são opcionais — se omitir, gera aleatório.
const ATTENDEES = [
  { nome: "Gabriel Marques", email: "gabriel.marques@sou.inteli.edu.br" },
];
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || "Red Bull 24H <gabriel.marques@sou.inteli.edu.br>";

const EQUIPES = [
  "Força Total", "Velocidade", "Resistência", "Sprint",
  "Maratona", "Endurance", "Power Run", "Ultra Team",
];

function randomKm() {
  return (Math.random() * 30 + 10).toFixed(1); // 10–40 km
}

function randomPace() {
  const totalSec = Math.floor(Math.random() * 120 + 240); // 4:00–6:00 /km
  const min = Math.floor(totalSec / 60);
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}/km`;
}

function randomEquipe() {
  return EQUIPES[Math.floor(Math.random() * EQUIPES.length)];
}

function buildCardUrl(nome, equipe, km, pace) {
  const p = new URLSearchParams({ nome, equipe, km, pace });
  return `${BASE_URL}/share/card-compartilhavel?${p.toString()}`;
}

async function sendOne(pessoa) {
  const km    = pessoa.km    ?? randomKm();
  const pace  = pessoa.pace  ?? randomPace();
  const equipe = pessoa.equipe ?? randomEquipe();
  const link = buildCardUrl(pessoa.nome, equipe, km, pace);

  await transporter.sendMail({
    from: FROM,
    to: pessoa.email,
    subject: `Seu resultado no Red Bull 24H — ${pessoa.nome}`,
    text: `Olá, ${pessoa.nome}!\n\nSeu card de desempenho do Red Bull 24H está disponível:\n\n${link}\n\nEquipe Red Bull 24H`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,system-ui,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto;">
    <tr><td style="padding:32px 24px;background:#111;border-radius:16px;border:1px solid #222;">
      <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#fff;">
        Parabéns, ${pessoa.nome}! 🏃
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
</html>`.trim(),
  });

  return { km, pace, equipe, link };
}

async function main() {
  if (ATTENDEES.length === 0) {
    console.error("Erro: ATTENDEES está vazio. Edite o script antes de rodar.");
    process.exit(1);
  }

  console.log(`Enviando para ${ATTENDEES.length} pessoa(s)...\n`);

  for (const pessoa of ATTENDEES) {
    try {
      const { km, pace, equipe } = await sendOne(pessoa);
      console.log(`✓ ${pessoa.nome} <${pessoa.email}> — ${equipe} | ${km} km | ${pace}`);
    } catch (err) {
      console.error(`✗ ${pessoa.nome} <${pessoa.email}> — ${err.message}`);
    }
  }

  console.log("\nConcluído.");
}

main();
