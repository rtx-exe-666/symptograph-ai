import { runQuery } from "./neo4j";

export async function seedMedicalGraph() {
  // Clear any existing Symptography constraints/nodes if necessary (keep simple for demo)
  const clearQuery = `
    MATCH (n)
    WHERE n:Medication OR n:Condition OR n:Symptom OR n:OrganSystem OR n:PreventativeHabit
    DETACH DELETE n
  `;
  await runQuery(clearQuery);

  const seedQuery = `
    // Create Organ Systems
    CREATE (cardio:OrganSystem { name: "Cardiovascular System", description: "Heart, blood vessels, and circulatory systems." })
    CREATE (endo:OrganSystem { name: "Endocrine System", description: "Hormone regulation, glands, and blood glucose." })
    CREATE (digest:OrganSystem { name: "Digestive System", description: "Esophagus, stomach, intestines, and food absorption." })
    CREATE (respir:OrganSystem { name: "Respiratory System", description: "Lungs, airways, and oxygen exchange." })

    // Create Conditions
    CREATE (htn:Condition { name: "Hypertension", description: "Chronic high blood pressure forcing blood against arterial walls." })
    CREATE (diab:Condition { name: "Type 2 Diabetes", description: "Metabolic disorder characterized by insulin resistance and high blood sugar." })
    CREATE (lipid:Condition { name: "Hyperlipidemia", description: "Elevated levels of lipids/cholesterol in the bloodstream." })
    CREATE (thyroid:Condition { name: "Hypothyroidism", description: "Underactive thyroid gland failing to produce enough metabolic hormones." })
    CREATE (gerd:Condition { name: "GERD (Acid Reflux)", description: "Stomach acid frequently flowing back into the esophagus." })
    CREATE (asthma:Condition { name: "Asthma", description: "Chronic inflammation of the lungs' airways causing breathing spasms." })

    // Create Medications
    CREATE (metformin:Medication { name: "Metformin 500mg", chemical: "Metformin", class: "Biguanide", purpose: "Lowers liver glucose production and increases insulin sensitivity." })
    CREATE (atorvastatin:Medication { name: "Atorvastatin 20mg", chemical: "Atorvastatin", class: "Statin", purpose: "Reduces LDL (bad) cholesterol and triglycerides in blood." })
    CREATE (lisinopril:Medication { name: "Lisinopril 10mg", chemical: "Lisinopril", class: "ACE Inhibitor", purpose: "Relaxes blood vessels to lower arterial blood pressure." })
    CREATE (levothyroxine:Medication { name: "Levothyroxine 50mcg", chemical: "Levothyroxine", class: "Thyroid Hormone", purpose: "Replaces missing thyroid hormone to restore metabolism." })
    CREATE (omeprazole:Medication { name: "Omeprazole 20mg", chemical: "Omeprazole", class: "Proton Pump Inhibitor", purpose: "Decreases the amount of acid produced in the stomach." })
    CREATE (albuterol:Medication { name: "Albuterol Inhaler", chemical: "Albuterol", class: "Beta-2 Agonist", purpose: "Relaxes airway muscles to quickly restore breathing." })

    // Create Symptoms
    CREATE (dizzy:Symptom { name: "Dizziness", description: "Feeling lightheaded or off-balance." })
    CREATE (fatigue:Symptom { name: "Fatigue", description: "Constant tiredness and lack of energy." })
    CREATE (urination:Symptom { name: "Frequent Urination", description: "Needing to urinate more often than usual." })
    CREATE (weight:Symptom { name: "Weight Gain", description: "Unexplained increase in body mass." })
    CREATE (heartburn:Symptom { name: "Heartburn", description: "Burning sensation in chest after eating." })
    CREATE (wheeze:Symptom { name: "Wheezing", description: "High-pitched whistling sound during breathing." })
    CREATE (musclePain:Symptom { name: "Muscle Pain", description: "Ache or soreness in muscles (often statin side-effect)." })
    CREATE (cough:Symptom { name: "Dry Cough", description: "Tickling persistent cough (common ACE inhibitor side-effect)." })

    // Create Preventative Habits
    CREATE (lowSalt:PreventativeHabit { name: "Low-Sodium Diet", impact: "Reduces water retention and eases arterial pressure." })
    CREATE (lowSugar:PreventativeHabit { name: "Low-Glycemic Diet", impact: "Prevents sharp spikes in blood glucose levels." })
    CREATE (exercise:PreventativeHabit { name: "Cardio Exercise", impact: "Strengthens heart muscle and lowers LDL cholesterol." })
    CREATE (walk:PreventativeHabit { name: "30-Min Daily Walk", impact: "Improves overall insulin resistance and metabolism." })
    CREATE (avoidLate:PreventativeHabit { name: "Avoid Late Meals", impact: "Prevents stomach acid backups during sleep." })

    // Relate Conditions to Organ Systems
    CREATE (htn)-[:AFFECTS]->(cardio)
    CREATE (lipid)-[:AFFECTS]->(cardio)
    CREATE (diab)-[:AFFECTS]->(endo)
    CREATE (thyroid)-[:AFFECTS]->(endo)
    CREATE (gerd)-[:AFFECTS]->(digest)
    CREATE (asthma)-[:AFFECTS]->(respir)

    // Relate Medications to Conditions
    CREATE (metformin)-[:TREATS]->(diab)
    CREATE (atorvastatin)-[:TREATS]->(lipid)
    CREATE (lisinopril)-[:TREATS]->(htn)
    CREATE (levothyroxine)-[:TREATS]->(thyroid)
    CREATE (omeprazole)-[:TREATS]->(gerd)
    CREATE (albuterol)-[:TREATS]->(asthma)

    // Relate Symptoms to Conditions (Indications)
    CREATE (urination)-[:INDICATES]->(diab)
    CREATE (fatigue)-[:INDICATES]->(diab)
    CREATE (fatigue)-[:INDICATES]->(thyroid)
    CREATE (weight)-[:INDICATES]->(thyroid)
    CREATE (heartburn)-[:INDICATES]->(gerd)
    CREATE (wheeze)-[:INDICATES]->(asthma)

    // Relate Side-Effects (Medication to Symptoms)
    CREATE (lisinopril)-[:HAS_SIDE_EFFECT]->(cough)
    CREATE (lisinopril)-[:HAS_SIDE_EFFECT]->(dizzy)
    CREATE (atorvastatin)-[:HAS_SIDE_EFFECT]->(musclePain)
    CREATE (metformin)-[:HAS_SIDE_EFFECT]->(fatigue) // vitamin B12 side effect

    // Relate Habits to Conditions
    CREATE (lowSalt)-[:PREVENTS]->(htn)
    CREATE (exercise)-[:PREVENTS]->(htn)
    CREATE (exercise)-[:PREVENTS]->(lipid)
    CREATE (lowSugar)-[:PREVENTS]->(diab)
    CREATE (walk)-[:PREVENTS]->(diab)
    CREATE (avoidLate)-[:PREVENTS]->(gerd)
  `;

  await runQuery(seedQuery);
  return { success: true, count: 28 };
}
