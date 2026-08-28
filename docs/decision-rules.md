# Decision Rules

The decision engine relies on JSON configurations in `backend/src/knowledge/` to evaluate farm context and risk.

## Risk Rules (`riskRules.json`)
Calculates the final Risk Score and determines the Risk Level.
- **Scoring Weights:** 
  - `disease_detected`: 40
  - `history_of_disease`: 20
  - `high_humidity`: 15
  - `extreme_temperature`: 15
  - `heavy_rain`: 10
- **Thresholds:** LOW (0-30), MEDIUM (31-70), HIGH (71-100).

## Weather Rules (`weatherRules.json`)
Triggers specific agronomic advice based on weather conditions.
- `weather_001`: Fires if `weather.windSpeed > 20`. (Advises against chemical spraying).
- `weather_002`: Fires if `weather.humidity > 85 AND weather.temperature > 25`. (Warns of high fungal risk).
- `weather_003`: Fires if `weather.rainExpected == true`. (Advises against foliar treatments).

## Irrigation Rules (`irrigation.json`)
Triggers water management advice.
- `irrigation_001`: Fires if `soil.moisture < 20% AND weather.rainExpected == false`.
- `irrigation_002`: Fires if `soil.moisture > 60%`.
- `irrigation_003`: Fires if `weather.rainExpected == true AND weather.rainfallProbability > 70`.

### Unreachable Rules
> [!WARNING]
> The conditions in `irrigation.json` containing `%` (e.g. `soil.moisture < 20%`) are currently unreachable if evaluated via a standard JS expression parser, as `%` is the modulo operator and `20%` is invalid syntax. The parser will fail to parse this rule.
