# -*- coding: utf-8 -*-
"""
Digital Financial Literacy AI Agent
Powered by IBM Watsonx.ai (Granite Models)
Backend: Flask + ibm-watsonx-ai
"""

import os
import json
import math
import logging
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# ─────────────────────────────────────────────────────────────────────────────
# AGENT INSTRUCTIONS — Customize the AI agent behavior here
# ─────────────────────────────────────────────────────────────────────────────
AGENT_INSTRUCTIONS = """
You are FinBot, an expert AI-powered Digital Financial Literacy assistant built for India and global users.

## PERSONA & TONE
- Friendly, empathetic, encouraging, and non-judgmental
- Use simple, clear language avoiding jargon; explain terms when used
- Celebrate small financial wins and build user confidence
- Be patient with beginners; adapt depth based on user's demonstrated knowledge level
- Always be positive, motivational, and solution-oriented

## CORE EXPERTISE AREAS
1. UPI & Digital Payments — UPI apps (GPay, PhonePe, Paytm, BHIM), QR codes, limits, safety
2. Online Scam Prevention — Phishing, vishing, smishing, KYC fraud, lottery scams, OTP fraud
3. Banking & Accounts — Jan Dhan Yojana, savings accounts, FD, RD, NEFT, RTGS, IMPS
4. Interest Rates — Simple interest, compound interest, loan EMI, credit card APR, savings yield
5. Personal Finance & Budgeting — 50/30/20 rule, envelope budgeting, zero-based budgeting
6. Investments — Mutual funds, SIP, PPF, NPS, equity basics, gold, real estate
7. Government Schemes — PM Kisan, Atal Pension Yojana, Sukanya Samriddhani, PMSBY, PMJJBY
8. Financial Goals — Emergency fund, home purchase, retirement, education planning
9. Credit & Loans — CIBIL score, home loans, personal loans, responsible borrowing
10. Tax Basics — Income tax slabs, 80C deductions, filing ITR, TDS

## MULTILINGUAL SUPPORT
- Detect language from user input and respond in the SAME language
- Support: English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা),
  Marathi (मराठी), Gujarati (ગુજરાતી), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം),
  Punjabi (ਪੰਜਾਬੀ), Odia (ଓଡ଼ିଆ), and other languages
- Use culturally relevant examples (amounts in ₹, local context)
- For mixed-language (Hinglish etc.), mirror the user's style

## DIVERSE USER BACKGROUNDS
- Rural users: Relate to agricultural income, kisan credit cards, crop insurance
- Women: Emphasize self-help groups, Mahila Samman Savings, financial independence
- Students: Part-time income, education loans, scholarship tracking, budgeting hostel expenses
- Senior citizens: Pension management, SCSS, medical expenses, avoiding elder fraud
- Gig workers: Irregular income budgeting, self-employment tax, health insurance
- Small business owners: GST basics, business loans, working capital management

## FRAUD PROTECTION RULES (ALWAYS ENFORCE)
- NEVER share OTP with anyone — banks never ask
- NEVER click unknown links claiming prizes/KYC updates
- NEVER pay upfront fees to receive money
- Verify merchant QR codes before scanning
- Use official apps only — verify app publisher
- Report fraud: cybercrime.gov.in or 1930 helpline

## GOVERNMENT RESOURCES TO REFERENCE
- RBI: rbi.org.in — banking regulations, complaints
- SEBI: sebi.gov.in — investment regulations
- IRDAI: irdai.gov.in — insurance
- NSE/BSE — stock market data
- FinMin: finmin.nic.in — government schemes
- DigiSaathi: 14431 — digital payment helpline

## EDUCATIONAL PLATFORMS
- RBI's "Be(A)ware" — financial fraud awareness
- NCFE (National Centre for Financial Education): ncfe.org.in
- MyMoney.gov.in — personal finance portal
- SEBI's Investor Education: investor.sebi.gov.in

## FINANCIAL GOAL GENERATION
When users describe their situation, proactively:
1. Identify short-term (< 1 year), medium-term (1-5 years), long-term (5+ years) goals
2. Calculate required monthly savings using compound interest
3. Suggest specific instruments (SIP, PPF, FD) with expected returns
4. Warn about risks and inflation impact
5. Create a step-by-step action plan

## RESPONSE FORMATTING
- Use bullet points and numbered lists for clarity
- Highlight key numbers and formulas
- Provide concrete examples with realistic Indian rupee amounts
- End responses with an encouraging note or next actionable step
- For calculations, show the formula and working
- Keep responses concise but complete (150-400 words typically)

## BOUNDARIES
- Do not provide specific stock tips or guaranteed return promises
- Recommend consulting a SEBI-registered financial advisor for large investments
- Do not ask for or store personal financial data like account numbers or passwords
- If asked about illegal activities, firmly redirect to legal options
"""

# ─────────────────────────────────────────────────────────────────────────────
# App Initialization
# ─────────────────────────────────────────────────────────────────────────────
load_dotenv()
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "finbot-secret-2024-xyz")
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# IBM Watsonx.ai Configuration
# ─────────────────────────────────────────────────────────────────────────────
IBM_API_KEY    = os.getenv("IBM_API_KEY")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID")
IBM_URL        = os.getenv("IBM_URL", "https://us-south.ml.cloud.ibm.com")
GRANITE_MODEL  = os.getenv("GRANITE_MODEL", "ibm/granite-4-h-small")

def get_watsonx_model():
    """Initialize IBM Watsonx.ai Granite model (uses chat API to avoid deprecation warning)."""
    try:
        credentials = Credentials(api_key=IBM_API_KEY, url=IBM_URL)
        model = ModelInference(
            model_id=GRANITE_MODEL,
            credentials=credentials,
            project_id=IBM_PROJECT_ID,
            params={
                GenParams.MAX_NEW_TOKENS: 1024,
                GenParams.MIN_NEW_TOKENS: 20,
                GenParams.TEMPERATURE: 0.7,
                GenParams.TOP_P: 0.9,
                GenParams.TOP_K: 50,
                GenParams.REPETITION_PENALTY: 1.1,
            }
        )
        return model
    except Exception as e:
        logger.error(f"Watsonx init error: {e}")
        return None

# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if "chat_history" not in session:
        session["chat_history"] = []
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """Main chat endpoint — sends message to Granite and returns response."""
    data = request.get_json()
    user_message = data.get("message", "").strip()
    language_hint = data.get("language", "auto")

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    # Retrieve or initialize session history
    history = session.get("chat_history", [])

    # Build conversation context (last 6 exchanges)
    recent = history[-6:] if len(history) > 6 else history
    conversation = ""
    for turn in recent:
        conversation += f"User: {turn['user']}\nAssistant: {turn['bot']}\n\n"

    prompt = f"""<|system|>
{AGENT_INSTRUCTIONS}
<|user|>
{conversation}User: {user_message}
<|assistant|>
"""

    try:
        model = get_watsonx_model()
        if not model:
            raise ConnectionError("Could not connect to Watsonx.ai")

        result = model.generate_text(prompt=prompt)
        bot_response = result.strip() if isinstance(result, str) else str(result)

        # Clean up any stray prompt artifacts
        for artifact in ["<|assistant|>", "<|user|>", "<|system|>"]:
            bot_response = bot_response.replace(artifact, "").strip()

        # Update session history
        history.append({"user": user_message, "bot": bot_response,
                         "timestamp": datetime.now().isoformat()})
        session["chat_history"] = history
        session.modified = True

        return jsonify({"response": bot_response, "status": "ok"})

    except Exception as e:
        logger.error(f"Chat error: {e}")
        fallback = get_fallback_response(user_message)
        return jsonify({"response": fallback, "status": "fallback", "error": str(e)})


@app.route("/api/sip-calculator", methods=["POST"])
def sip_calculator():
    """SIP (Systematic Investment Plan) calculator."""
    data = request.get_json()
    try:
        monthly = float(data.get("monthly_investment", 0))
        rate    = float(data.get("annual_rate", 12)) / 100 / 12
        years   = int(data.get("years", 10))
        months  = years * 12

        if rate == 0:
            maturity = monthly * months
        else:
            maturity = monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate)

        invested  = monthly * months
        gains     = maturity - invested
        gain_pct  = (gains / invested * 100) if invested > 0 else 0

        # Year-by-year breakdown
        breakdown = []
        for y in range(1, years + 1):
            m = y * 12
            val = monthly * (((1 + rate) ** m - 1) / rate) * (1 + rate) if rate else monthly * m
            breakdown.append({"year": y, "value": round(val, 2), "invested": round(monthly * m, 2)})

        return jsonify({
            "maturity_value": round(maturity, 2),
            "total_invested": round(invested, 2),
            "total_gains": round(gains, 2),
            "gain_percentage": round(gain_pct, 2),
            "breakdown": breakdown
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/emi-calculator", methods=["POST"])
def emi_calculator():
    """Loan EMI calculator."""
    data = request.get_json()
    try:
        principal   = float(data.get("principal", 0))
        annual_rate = float(data.get("annual_rate", 10))
        years       = int(data.get("years", 5))

        r = annual_rate / 100 / 12
        n = years * 12

        if r == 0:
            emi = principal / n
        else:
            emi = principal * r * (1 + r) ** n / ((1 + r) ** n - 1)

        total_payment = emi * n
        total_interest = total_payment - principal

        return jsonify({
            "emi": round(emi, 2),
            "total_payment": round(total_payment, 2),
            "total_interest": round(total_interest, 2),
            "principal": round(principal, 2),
            "interest_percentage": round((total_interest / total_payment * 100), 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/api/financial-goals", methods=["POST"])
def financial_goals():
    """Generate personalized financial goals using Watsonx.ai."""
    data = request.get_json()
    income    = data.get("monthly_income", 0)
    expenses  = data.get("monthly_expenses", 0)
    age       = data.get("age", 30)
    goals_req = data.get("goals", "retirement, emergency fund")

    prompt = f"""<|system|>
{AGENT_INSTRUCTIONS}
<|user|>
Generate a detailed personalized financial plan for someone with:
- Monthly Income: ₹{income}
- Monthly Expenses: ₹{expenses}
- Age: {age} years
- Goals: {goals_req}

Provide:
1. Current financial health assessment
2. Monthly savings potential
3. Specific goals with timelines and target amounts
4. Recommended investment instruments for each goal
5. Action steps for next 30 days

Be specific with numbers and calculations.
<|assistant|>
"""
    try:
        model = get_watsonx_model()
        result = model.generate_text(prompt=prompt)
        return jsonify({"plan": result.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/scam-check", methods=["POST"])
def scam_check():
    """Analyze a scenario for potential fraud indicators."""
    data = request.get_json()
    scenario = data.get("scenario", "")

    prompt = f"""<|system|>
{AGENT_INSTRUCTIONS}
<|user|>
Analyze this scenario for potential financial fraud/scam indicators:
"{scenario}"

Respond with:
1. RISK LEVEL: (LOW / MEDIUM / HIGH / CRITICAL)
2. Red flags identified
3. What legitimate organizations never do
4. Recommended immediate actions
5. Where to report if it's a scam

Be direct and protect the user.
<|assistant|>
"""
    try:
        model = get_watsonx_model()
        result = model.generate_text(prompt=prompt)
        # Extract risk level for frontend coloring
        risk = "MEDIUM"
        result_upper = result.upper()
        if "CRITICAL" in result_upper:
            risk = "CRITICAL"
        elif "HIGH" in result_upper:
            risk = "HIGH"
        elif "LOW" in result_upper:
            risk = "LOW"
        return jsonify({"analysis": result.strip(), "risk_level": risk})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/clear-history", methods=["POST"])
def clear_history():
    """Clear chat history for the current session."""
    session["chat_history"] = []
    session.modified = True
    return jsonify({"status": "cleared"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model": GRANITE_MODEL,
        "timestamp": datetime.now().isoformat(),
        "watsonx_configured": bool(IBM_API_KEY and IBM_PROJECT_ID)
    })

# ─────────────────────────────────────────────────────────────────────────────
# Fallback Responses (when Watsonx is unavailable)
# ─────────────────────────────────────────────────────────────────────────────
def get_fallback_response(message: str) -> str:
    msg = message.lower()
    if any(w in msg for w in ["upi", "gpay", "phonepay", "paytm"]):
        return ("**UPI Safety Tips:**\n\n"
                "• Never share your UPI PIN with anyone\n"
                "• Verify merchant name before paying\n"
                "• Use only official apps (verify publisher in app store)\n"
                "• For disputes: call 14431 (DigiSaathi)\n\n"
                "⚠️ *Note: AI service temporarily unavailable. Showing cached guidance.*")
    if any(w in msg for w in ["scam", "fraud", "otp", "phishing"]):
        return ("**🚨 Fraud Alert Guidance:**\n\n"
                "• Never share OTP — no bank ever asks for it\n"
                "• Hang up on callers claiming to be from bank/police\n"
                "• Report fraud: **1930** or cybercrime.gov.in\n\n"
                "⚠️ *AI service temporarily unavailable.*")
    if any(w in msg for w in ["sip", "mutual fund", "invest"]):
        return ("**SIP Basics:**\n\n"
                "• SIP = Systematic Investment Plan in mutual funds\n"
                "• Start with as low as ₹500/month\n"
                "• Power of compounding over 10+ years\n"
                "• Use the SIP Calculator tab for projections\n\n"
                "⚠️ *AI service temporarily unavailable.*")
    return ("I'm here to help with digital financial literacy! 💡\n\n"
            "You can ask me about:\n"
            "• UPI & digital payments\n"
            "• Avoiding online scams\n"
            "• SIP & investments\n"
            "• Banking & interest rates\n"
            "• Budgeting & financial goals\n\n"
            "⚠️ *AI service temporarily unavailable. Please check your API credentials.*")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
