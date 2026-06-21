"""
Dynamique Israël Mutombo — Service IA
Détection faux signalements · Analyse sentiment · Doublons · Prédiction zones
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import re
import math
from datetime import datetime

app = FastAPI(
    title="Dynamique RDC — AI Service",
    description="Service d'intelligence artificielle pour la plateforme citoyenne",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    title: str
    description: str
    category: str
    province: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AnalyzeResponse(BaseModel):
    confidence_score: float
    is_duplicate: bool
    sentiment: str
    sentiment_score: float
    is_spam: bool
    risk_level: str
    summary: str
    tags: List[str]

class SentimentRequest(BaseModel):
    text: str

class DuplicateCheckRequest(BaseModel):
    title: str
    description: str
    province: Optional[str]
    recent_reports: List[dict]

class PredictionRequest(BaseModel):
    province: str
    historical_data: List[dict]

# ─────────────────────────────────────────────
# Keyword lists (FR + Lingala)
# ─────────────────────────────────────────────

SPAM_PATTERNS = [
    r'\b(test|lorem|ipsum|aaa+|xxx+|zzz+)\b',
    r'^.{1,10}$',  # too short
    r'(.)\1{5,}',  # repeated characters
    r'(https?://\S+.*){3,}',  # too many links
]

HIGH_RISK_KEYWORDS = [
    'mort', 'tué', 'décès', 'victime', 'urgence', 'sos', 'aide',
    'blessé', 'violence', 'viol', 'massacre', 'attaque', 'kidnapping',
    'enlèvement', 'incendie', 'explosion', 'coup de feu', 'arme',
    'milice', 'groupes armés', 'terroriste'
]

NEGATIVE_KEYWORDS = [
    'problème', 'abus', 'corruption', 'injustice', 'tracasserie',
    'extorsion', 'menace', 'insécurité', 'banditisme', 'vol',
    'agression', 'accident', 'dégradation', 'obstacle'
]

POSITIVE_KEYWORDS = [
    'résolu', 'amélioré', 'réparé', 'intervention', 'solution',
    'merci', 'excellent', 'bien', 'succès', 'progrès'
]

CATEGORY_KEYWORDS = {
    'INSECURITY': ['insécurité', 'vol', 'agression', 'bandit', 'criminel', 'attaque'],
    'TRANSPORT': ['taxi', 'bus', 'chauffeur', 'route', 'transport', 'véhicule', 'embouteillage'],
    'CORRUPTION': ['corruption', 'pot-de-vin', 'soudoyer', 'détournement', 'impunité'],
    'TRIBALISM': ['tribalisme', 'ethnie', 'discrimination', 'xénophobie'],
    'BANDITRY': ['banditisme', 'gang', 'pillage', 'braquage'],
}

# ─────────────────────────────────────────────
# Core analysis functions
# ─────────────────────────────────────────────

def detect_spam(text: str) -> bool:
    """Rule-based spam detection."""
    combined = text.lower().strip()
    for pattern in SPAM_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True
    words = combined.split()
    if len(words) < 5:
        return True
    unique_ratio = len(set(words)) / len(words)
    if unique_ratio < 0.3:
        return True
    return False

def analyze_sentiment(text: str) -> tuple[str, float]:
    """Keyword-based sentiment analysis (3 classes)."""
    text_lower = text.lower()

    high_risk_count = sum(1 for kw in HIGH_RISK_KEYWORDS if kw in text_lower)
    negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)
    positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)

    if high_risk_count >= 2:
        return "ALARMING", min(0.95, 0.7 + high_risk_count * 0.05)

    score = (negative_count - positive_count) / max(1, negative_count + positive_count + 1)

    if score > 0.3:
        return "NEGATIVE", min(0.9, 0.5 + score)
    elif score < -0.3:
        return "POSITIVE", min(0.9, 0.5 - score)
    else:
        return "NEUTRAL", 0.5

def compute_confidence_score(
    title: str,
    description: str,
    category: str,
    is_spam: bool,
    sentiment: str
) -> float:
    """Compute trust/confidence score for a report."""
    if is_spam:
        return 0.1

    score = 0.5

    # Length bonus
    word_count = len(description.split())
    if word_count > 50:
        score += 0.1
    if word_count > 150:
        score += 0.1

    # Category keyword match
    cat_keywords = CATEGORY_KEYWORDS.get(category, [])
    matches = sum(1 for kw in cat_keywords if kw in description.lower() or kw in title.lower())
    score += min(0.2, matches * 0.05)

    # Alarming reports get slight boost (real urgency detected)
    if sentiment == "ALARMING":
        score += 0.05

    # Clamp
    return round(min(0.98, max(0.1, score)), 2)

def check_duplicate(title: str, description: str, recent_reports: List[dict]) -> bool:
    """Simple similarity check for duplicates."""
    title_words = set(title.lower().split())
    desc_words = set(description.lower().split())

    for report in recent_reports:
        r_title_words = set(report.get('title', '').lower().split())
        r_desc_words = set(report.get('description', '').lower().split())

        if len(title_words) == 0 or len(r_title_words) == 0:
            continue

        title_sim = len(title_words & r_title_words) / len(title_words | r_title_words)
        desc_sim = len(desc_words & r_desc_words) / len(desc_words | r_desc_words) if (desc_words | r_desc_words) else 0

        combined_sim = 0.6 * title_sim + 0.4 * desc_sim
        if combined_sim > 0.7:
            return True

    return False

def determine_risk_level(sentiment: str, confidence: float, category: str) -> str:
    """Determine risk level for prioritization."""
    high_risk_categories = {'INSECURITY', 'BANDITRY'}

    if sentiment == "ALARMING" or (category in high_risk_categories and confidence > 0.7):
        return "HIGH"
    elif sentiment == "NEGATIVE" and confidence > 0.6:
        return "MEDIUM"
    else:
        return "LOW"

def generate_summary(title: str, description: str, category: str) -> str:
    """Extract first meaningful sentence as summary."""
    sentences = re.split(r'[.!?]\s+', description.strip())
    meaningful = [s for s in sentences if len(s.split()) >= 5]
    if meaningful:
        return meaningful[0][:200] + ('...' if len(meaningful[0]) > 200 else '')
    return description[:200]

def extract_tags(title: str, description: str, category: str) -> List[str]:
    """Extract relevant tags."""
    tags = [category.lower()]
    text = (title + ' ' + description).lower()

    keyword_tags = {
        'transport': 'transport',
        'corruption': 'corruption',
        'police': 'forces-de-lordre',
        'route': 'infrastructure',
        'marché': 'commerce',
        'école': 'éducation',
        'hôpital': 'santé',
        'eau': 'eau-potable',
        'électricité': 'énergie',
        'enfant': 'enfants',
        'femme': 'femmes',
    }

    for keyword, tag in keyword_tags.items():
        if keyword in text and tag not in tags:
            tags.append(tag)

    return tags[:5]

# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "Dynamique AI", "timestamp": datetime.now().isoformat()}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_report(req: AnalyzeRequest):
    """Full analysis of a citizen report."""
    try:
        is_spam = detect_spam(req.title + ' ' + req.description)
        sentiment, sentiment_score = analyze_sentiment(req.description)
        confidence = compute_confidence_score(
            req.title, req.description, req.category, is_spam, sentiment
        )
        risk_level = determine_risk_level(sentiment, confidence, req.category)
        summary = generate_summary(req.title, req.description, req.category)
        tags = extract_tags(req.title, req.description, req.category)

        return AnalyzeResponse(
            confidence_score=confidence,
            is_duplicate=False,
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            is_spam=is_spam,
            risk_level=risk_level,
            summary=summary,
            tags=tags,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sentiment")
def sentiment_analysis(req: SentimentRequest):
    """Analyze sentiment of text."""
    sentiment, score = analyze_sentiment(req.text)
    return {"sentiment": sentiment, "score": score}

@app.post("/check-duplicate")
def duplicate_check(req: DuplicateCheckRequest):
    """Check if a report is a duplicate."""
    is_dup = check_duplicate(req.title, req.description, req.recent_reports)
    return {"is_duplicate": is_dup}

@app.post("/moderate-content")
def moderate_content(req: SentimentRequest):
    """Detect hate speech, tribalism, violence in text."""
    text = req.text.lower()

    hate_keywords = ['tribu', 'ethnie', 'kasaïen', 'katangais', 'luba', 'kongo', 'nkisi', 'mbulu']
    violence_keywords = ['tuer', 'mourir', 'mort', 'explosif', 'arme', 'bombe']

    hate_score = sum(0.2 for kw in hate_keywords if kw in text)
    violence_score = sum(0.25 for kw in violence_keywords if kw in text)

    flags = []
    if hate_score > 0.3:
        flags.append("HATE_SPEECH")
    if violence_score > 0.3:
        flags.append("VIOLENCE")

    return {
        "is_safe": len(flags) == 0,
        "flags": flags,
        "hate_score": min(1.0, hate_score),
        "violence_score": min(1.0, violence_score),
    }

@app.post("/predict-risk")
def predict_risk(req: PredictionRequest):
    """Predict risk level for a province based on historical data."""
    data = req.historical_data
    if not data:
        return {"risk_level": "LOW", "confidence": 0.5, "trend": "STABLE"}

    recent = data[-7:] if len(data) >= 7 else data
    avg_recent = sum(d.get('count', 0) for d in recent) / len(recent)

    older = data[-30:-7] if len(data) >= 30 else data[:max(1, len(data)//2)]
    avg_older = sum(d.get('count', 0) for d in older) / max(1, len(older))

    trend = "INCREASING" if avg_recent > avg_older * 1.2 else \
            "DECREASING" if avg_recent < avg_older * 0.8 else "STABLE"

    risk = "HIGH" if avg_recent > 50 else "MEDIUM" if avg_recent > 20 else "LOW"

    return {
        "province": req.province,
        "risk_level": risk,
        "trend": trend,
        "avg_daily_reports": round(avg_recent, 1),
        "confidence": 0.75,
    }

@app.get("/provinces/risk-map")
def province_risk_map():
    """Return risk assessment for all 26 provinces."""
    provinces_data = {
        "NORD_KIVU": {"risk": "HIGH", "note": "Zone rouge — surveillance renforcée"},
        "SUD_KIVU": {"risk": "HIGH", "note": "Conflits actifs"},
        "ITURI": {"risk": "HIGH", "note": "Tensions sécuritaires"},
        "KINSHASA": {"risk": "MEDIUM", "note": "Densité urbaine élevée"},
        "LUALABA": {"risk": "MEDIUM", "note": "Zone minière"},
        "HAUT_KATANGA": {"risk": "MEDIUM", "note": "Hub économique"},
        "MANIEMA": {"risk": "MEDIUM", "note": "Extraction artisanale"},
    }

    all_provinces = [
        "KINSHASA","KONGO_CENTRAL","KWANGO","KWILU","MAI_NDOMBE","KASAI",
        "KASAI_CENTRAL","KASAI_ORIENTAL","LOMAMI","SANKURU","MANIEMA","SUD_KIVU",
        "NORD_KIVU","ITURI","HAUT_UELE","BAS_UELE","TSHOPO","MONGALA","NORD_UBANGI",
        "SUD_UBANGI","EQUATEUR","TSHUAPA","TANGANIKA","HAUT_LOMAMI","LUALABA","HAUT_KATANGA"
    ]

    result = {}
    for province in all_provinces:
        result[province] = provinces_data.get(province, {"risk": "LOW", "note": "Surveillance normale"})

    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
