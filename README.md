# ═══════════════════════════════════════════════════════════════════════
# FinBot AI — Digital Financial Literacy
# Deployment & Setup Guide
# ═══════════════════════════════════════════════════════════════════════

# 🚀 Digital Financial Literacy AI Agent
### Powered by IBM Watsonx.ai • Granite Models • Flask

An AI-powered financial literacy web application helping users across India and globally
understand digital payments, avoid scams, plan investments, and achieve financial goals —
in 10+ languages.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 AI Chat | IBM Watsonx Granite-powered conversational assistant |
| 🌐 Multilingual | Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi + more |
| 📈 SIP Calculator | Animated SIP returns with year-by-year chart |
| 🏠 EMI Calculator | Loan EMI with principal vs. interest breakdown |
| 📊 Budget Planner | 50/30/20 rule visualizer |
| 🎯 Financial Goals | AI-generated personalized financial roadmap |
| 🚨 Scam Detector | AI fraud analysis with risk level assessment |
| 📚 Learn Library | 8 financial topic modules with AI explanations |
| 🌙 Dark Mode | Full dark/light theme toggle with persistence |
| 📱 Mobile-first | Fully responsive Bootstrap 5 design |

---

## 🛠️ Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- IBM Cloud account (free tier works)
- IBM Watsonx.ai project

---

## 📦 Installation

### Step 1: Clone / Download the project
```bash
cd "Digital Financial Literacy"
```

### Step 2: Create a virtual environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure credentials
```bash
# Copy the example env file
cp .env.example .env    # macOS/Linux
copy .env.example .env  # Windows
```

Edit `.env` and fill in your credentials:
```
IBM_API_KEY=your_ibm_cloud_api_key
IBM_PROJECT_ID=your_watsonx_project_id
IBM_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL=ibm/granite-3-3-8b-instruct
FLASK_SECRET_KEY=your-random-secret-string
```

### Step 5: Run the application
```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## 🔑 Getting IBM Credentials

### IBM API Key
1. Go to [cloud.ibm.com](https://cloud.ibm.com)
2. Sign in or create a free account
3. Click your profile → **Manage** → **Access (IAM)**
4. Click **API keys** → **Create an IBM Cloud API key**
5. Copy and save the key

### IBM Project ID
1. Go to [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
2. Click **New project** → **Create an empty project**
3. Give it a name and click **Create**
4. Go to **Manage** tab → copy the **Project ID**

### Enabling Watsonx.ai
1. From your IBM Cloud dashboard, search for **"Watson Machine Learning"**
2. Create a free **Lite** plan instance
3. Associate it with your project in Watsonx.ai

---

## 🤖 Customizing the AI Agent

Edit the `AGENT_INSTRUCTIONS` variable in `app.py` to customize:

```python
AGENT_INSTRUCTIONS = """
You are FinBot, an expert AI-powered Digital Financial Literacy assistant...

## PERSONA & TONE
- Adjust tone: formal/casual/friendly

## CORE EXPERTISE AREAS
- Add/remove financial topics

## MULTILINGUAL SUPPORT
- Configure languages

## FRAUD PROTECTION RULES
- Customize safety guidelines
"""
```

**What you can customize:**
- 🎭 **Persona & Tone** — formal, casual, encouraging
- 🌐 **Languages** — add/remove supported languages
- 📚 **Expertise areas** — add new financial domains
- 🚫 **Fraud rules** — customize safety warnings
- 🎯 **Goal generation** — modify planning approach
- 👥 **User backgrounds** — tailor for specific audiences

---

## 🎛️ Available Granite Models

| Model ID | Description |
|---|---|
| `ibm/granite-3-3-8b-instruct` | **Default** — Fast, multilingual, balanced |
| `ibm/granite-13b-instruct-v2` | More capable, richer responses |
| `ibm/granite-3-2-8b-instruct` | Latest generation |

Change via `.env`:
```
GRANITE_MODEL=ibm/granite-13b-instruct-v2
```

---

## 🌐 Production Deployment

### Option 1: Gunicorn (Linux/macOS)
```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 app:app
```

### Option 2: Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

```bash
docker build -t finbot-ai .
docker run -p 5000:5000 --env-file .env finbot-ai
```

### Option 3: IBM Code Engine (1-click deploy)
1. Create a Code Engine project in IBM Cloud
2. Build from source or push Docker image
3. Set environment variables in the Code Engine UI
4. Deploy with a public URL

### Option 4: Railway / Render / Heroku
- Set environment variables in the platform dashboard
- Add `Procfile`: `web: gunicorn app:app`
- Deploy from Git

---

## 🔒 Security Notes

- **Never commit `.env`** — it's in `.gitignore`
- Use a strong random `FLASK_SECRET_KEY` in production
- Set `FLASK_DEBUG=false` in production
- Use HTTPS in production (handled by Nginx/platform)
- Sessions are server-side; consider Redis for multi-instance

---

## 📁 Project Structure

```
Digital Financial Literacy/
├── app.py                    # Flask backend + AGENT_INSTRUCTIONS
├── requirements.txt          # Python dependencies
├── .env.example              # Credentials template
├── .env                      # Your credentials (DO NOT COMMIT)
├── README.md                 # This file
├── templates/
│   └── index.html            # Full frontend (Bootstrap 5)
└── static/
    ├── css/
    │   └── style.css         # Custom styles + dark mode
    └── js/
        └── app.js            # All frontend logic + calculators
```

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Main application |
| POST | `/api/chat` | Send message to AI |
| POST | `/api/sip-calculator` | SIP returns calculator |
| POST | `/api/emi-calculator` | Loan EMI calculator |
| POST | `/api/financial-goals` | AI financial goal generation |
| POST | `/api/scam-check` | Fraud analysis |
| POST | `/api/clear-history` | Clear chat session |
| GET | `/api/health` | Health check |

---

## 🆘 Troubleshooting

**"Could not connect to Watsonx.ai"**
- Check `IBM_API_KEY` and `IBM_PROJECT_ID` in `.env`
- Ensure Watson Machine Learning service is provisioned
- Verify the `IBM_URL` matches your region

**"Model not found"**
- Check `GRANITE_MODEL` is a valid model ID
- Visit watsonx.ai Prompt Lab to see available models

**Chat shows fallback responses**
- API credentials may be invalid
- Check network connectivity
- View logs: `flask run --debug`

**Port already in use**
- Change `PORT=5001` in `.env`

---

## 🤝 Support Resources

| Resource | URL |
|---|---|
| IBM Watsonx.ai Docs | https://dataplatform.cloud.ibm.com/docs |
| Flask Documentation | https://flask.palletsprojects.com |
| Cyber Crime Portal | https://cybercrime.gov.in |
| Fraud Helpline | 1930 |
| DigiSaathi | 14431 |

---

*Built with ❤️ using IBM Watsonx.ai Granite • Empowering Financial Literacy for All*
