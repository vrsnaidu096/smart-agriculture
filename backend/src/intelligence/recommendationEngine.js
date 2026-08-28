const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

class RecommendationEngine {
  constructor() {
    this.knowledgeBase = [];
    this.loadKnowledgeBase();
    
    // Initialize Gemini only if API key is present
    this.ai = process.env.GEMINI_API_KEY 
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;
  }

  loadKnowledgeBase() {
    const kbDir = path.join(__dirname, '../knowledge/diseases');
    if (!fs.existsSync(kbDir)) return;
    
    const files = fs.readdirSync(kbDir);
    for (const file of files) {
      if (file.endsWith('.json') && file !== 'general.json') {
        try {
          const filePath = path.join(kbDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (Array.isArray(data)) {
            this.knowledgeBase.push(...data);
          }
        } catch (e) {
          console.error(`[RecommendationEngine] Error loading ${file}:`, e.message);
        }
      }
    }
  }

  normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  getStaticFallback(diseaseName) {
    const normalizedDetected = this.normalizeName(diseaseName);
    
    let matchedDisease = null;
    for (const d of this.knowledgeBase) {
      const normalizedKB = this.normalizeName(d.name);
      if (
        normalizedKB === normalizedDetected ||
        normalizedKB.includes(normalizedDetected) ||
        normalizedDetected.includes(normalizedKB)
      ) {
        matchedDisease = d;
        break;
      }
    }

    if (matchedDisease) {
      return {
        symptoms: matchedDisease.symptoms || null,
        precautions: matchedDisease.precautions || null,
        monitoring: matchedDisease.monitoring || null
      };
    }
    return { symptoms: null, precautions: null, monitoring: null };
  }

  async fetchSmartRecommendation(diseaseName, farmContext) {
    if (!this.ai) throw new Error("No Gemini API Key");

    const temp = farmContext.weather?.temperature || 'unknown';
    const moisture = farmContext.soil?.moisture || 'unknown';
    
    const prompt = `
You are an expert Agronomist. 
A farmer's crop has been diagnosed with "${diseaseName}".
Current Farm Conditions:
- Weather Temperature: ${temp}°C
- Soil Moisture (0-1 scale): ${moisture}

Return a strict JSON object with exactly these three string fields describing what the farmer should do:
1. "symptoms": A short sentence describing how to visually verify this disease on the leaf.
2. "precautions": 2 bullet points on immediate chemical/agronomic action based on the weather/soil.
3. "monitoring": 1 sentence on when they should check the field again.

Do not include markdown blocks, just return raw JSON.
`;

    // Strict 3-second timeout circuit breaker
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("LLM Timeout")), 3000);
    });

    const llmPromise = this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    }).then(response => {
       return JSON.parse(response.text);
    });

    return Promise.race([llmPromise, timeoutPromise]);
  }

  async enrich(safeRecommendations, farmContext) {
    if (!farmContext || !farmContext.disease || !farmContext.disease.disease) {
      return { symptoms: null, precautions: null, monitoring: null };
    }

    const diseaseName = farmContext.disease.disease;

    // 1. Try the LLM Smart Recommendation
    try {
      console.log(`[RecommendationEngine] Attempting Smart LLM Recommendation for ${diseaseName}...`);
      const smartData = await this.fetchSmartRecommendation(diseaseName, farmContext);
      console.log(`[RecommendationEngine] LLM Success! Serving dynamic AI recommendation.`);
      return smartData;
    } catch (error) {
      // 2. Fallback Mechanism triggers immediately on timeout or error
      console.warn(`[RecommendationEngine] LLM Failed (${error.message}). FALLING BACK to static JSON database.`);
      return this.getStaticFallback(diseaseName);
    }
  }
}

module.exports = new RecommendationEngine();
