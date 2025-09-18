# Slack Jira Bot

Bot para crear tickets de **Jira** automáticamente desde mensajes en **Slack** usando **/jira-bug**.  
Ideal para equipos de QA y desarrollo que quieran optimizar el flujo de reporte de bugs.

---

## 🚀 Requisitos

- [Node.js](https://nodejs.org/) >= 18  
- Cuenta en **Jira Cloud**  
- Cuenta en **Slack** con permisos para crear apps y bots  
- Una API Key de OpenAI (opcional, si usás procesamiento de texto con GPT)  

---

## ⚙️ Configuración

### Pasos de instalación y uso

```bash
# 1. Clonar el repositorio
git clone https://github.com/alejandramejias-star/slack-jira-bot.git
cd slack-jira-bot

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env

# Editar el archivo .env y completar con tus credenciales:
# ------------------------------------
OPENAI_API_KEY=
JIRA_API_TOKEN=
JIRA_EMAIL=
JIRA_URL=
JIRA_PROJECT_KEY=
SLACK_WEBHOOK_URL=
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
# ------------------------------------

# 4. Levantar el servidor local
npm start

# 5. Exponer el puerto con ngrok
ngrok http 3000

# 6. Configurar la URL pública en Slack
# Ir a Slack → Event Subscriptions → Request URL
# Pegar la URL pública de ngrok terminada en /slack/events
# Ejemplo:
# https://<TU-NGROK-ID>.ngrok-free.app/slack/events

# 📝 Comandos disponibles
# ------------------------
# /jira-bug [descripción]
# Crea un ticket en Jira con el formato definido:
# [Producto | Pantalla | Área] Descripción breve
# El resto del mensaje se usará como descripción.
