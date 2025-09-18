import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const JIRA_URL = process.env.JIRA_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

// --- Helpers ---
function yaEstaFormateado(texto) {
  const patrones = [/Resumen/i, /Descripción/i, /Pasos/i, /Resultado/i];
  return patrones.some(p => p.test(texto));
}

// Parsear la descripción a formato Atlassian (ADF)
function parsearDescripcionADF(texto) {
  const lineas = texto.split("\n").map(l => l.trim()).filter(Boolean);

  const adfContent = [];

  for (let linea of lineas) {
    if (
      /^##/.test(linea) ||
      /^(Resumen|Descripción|Pasos|Resultado|Adjuntos)/i.test(linea)
    ) {
      adfContent.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: linea.replace(/^##\s*/, ""),
            marks: [{ type: "strong" }],
          },
        ],
      });
    } else {
      adfContent.push({
        type: "paragraph",
        content: [{ type: "text", text: linea }],
      });
    }
  }

  return {
    type: "doc",
    version: 1,
    content: adfContent,
  };
}

// --- Generar ticket ---
async function generarTicket(prompt) {
  if (yaEstaFormateado(prompt)) {
    const lineas = prompt.split("\n").map(l => l.trim()).filter(Boolean);

    // Buscar la primera línea con corchetes como título
    let summaryLinea = lineas.find(l => l.includes("[") && l.includes("]"));
    let summary = summaryLinea ? summaryLinea : lineas[0];

    if (summary.length > 255) {
      summary = summary.slice(0, 252) + "...";
    }

    let description = lineas.filter(l => l !== summaryLinea).join("\n");

    return {
      summary,
      description,
      issuetype: "Bug",
    };
  } else {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content: `Convierte este texto en un ticket Jira en JSON válido:
          {
            "summary": "<resumen breve (máx 255 caracteres)>",
            "description": "<descripción detallada con pasos>",
            "issuetype": "Bug"
          }
          Texto: "${prompt}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  }
}

// --- Crear en Jira ---
async function crearTicket(ticket) {
  const url = `${JIRA_URL}/rest/api/3/issue`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: ticket.summary,
      description: parsearDescripcionADF(ticket.description), // 👈 usamos ADF
      issuetype: { name: ticket.issuetype },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}

// --- Endpoint para Slack ---
app.post("/slack/jira-bug", async (req, res) => {
  const prompt = req.body.text;

  try {
    const ticket = await generarTicket(prompt);
    const jiraResponse = await crearTicket(ticket);

    res.send(`✅ Ticket creado en Jira: ${jiraResponse.key}`);
  } catch (err) {
    console.error("Error al crear ticket en Jira:", err.message);

    // ⚠️ Slack no acepta 500 → devolvemos siempre 200
    res.status(200).send("❌ Error al crear el ticket: " + err.message);
  }
});

// --- Levantar servidor ---
app.listen(3000, () => {
  console.log("Servidor escuchando en puerto 3000");
});
