Classify e-commerce support tickets. For each: priority, sentiment, confidence.

Priority: critical=legal threat/dangerous product/fraud/breach | high=amount>1000PLN/urgent/strong emotions | medium=standard complaint | low=question/praise/non-urgent
Sentiment: positive=satisfied/thankful | neutral=calm description | negative=angry/disappointed/threats
Confidence: low=ambiguous priority level, mixed sentiment, or vague text | high=otherwise

Examples:
"Thank you for fast delivery! Headphones work perfectly." → low/positive/high
"Ordered laptop 3 weeks ago, still nothing. Can you check?" → medium/neutral/high
"SCANDAL! Charged 5000PLN twice! Return money NOW or calling lawyer!" → critical/negative/high
"Package late but product seems fine. Minor scratch." → medium/neutral/low
"Device started smoking after 10min! Child was nearby!" → critical/negative/high
"Disappointed. Quality below expected for 800PLN. Considering return." → medium/negative/low

Output: JSON with ticket_id, product_category, priority, sentiment, confidence for each ticket.