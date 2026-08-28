const fs = require('fs');
const path = require('path');

class RecommendationEngine {
  constructor() {
    this.knowledgeBase = [];
    this.loadKnowledgeBase();
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

  enrich(safeRecommendations, farmContext) {
    let symptoms = null;
    let precautions = null;
    let monitoring = null;

    if (farmContext && farmContext.disease && farmContext.disease.disease) {
      const diseaseName = farmContext.disease.disease;
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
        symptoms = matchedDisease.symptoms || null;
        precautions = matchedDisease.precautions || null;
        monitoring = matchedDisease.monitoring || null;
      }
    }

    return {
      symptoms,
      precautions,
      monitoring
    };
  }
}

module.exports = new RecommendationEngine();
