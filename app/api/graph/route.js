import { runQuery, isNeo4jConfigured } from "@/lib/neo4j";

const graphCache = new Map();

export async function POST(request) {
  try {
    const { conditionName, medicineName } = await request.json();
    
    const cacheKey = `${conditionName || ''}_${medicineName || ''}`;
    if (graphCache.has(cacheKey)) {
      return Response.json(graphCache.get(cacheKey));
    }

    // Fallback Mock Graph data if Neo4j is not configured
    const demoMode = !isNeo4jConfigured();
    if (demoMode) {
      const mockRes = getMockGraphData(conditionName || medicineName || "Hypertension");
      graphCache.set(cacheKey, mockRes);
      return Response.json(mockRes);
    }

    // Connect to Aura and query live database relations!
    let matchCondition = conditionName;
    if (!matchCondition && medicineName) {
      const medRes = await runQuery(
        `MATCH (m:Medication)-[:TREATS]->(c:Condition) WHERE m.name CONTAINS $medName RETURN c.name AS condName`,
        { medName: medicineName.split(" ")[0] }
      );
      if (medRes && medRes.length > 0) {
        matchCondition = medRes[0].get("condName");
      }
    }

    if (!matchCondition) {
      matchCondition = "Hypertension"; // Default fallback
    }

    const graphRes = await runQuery(`
      MATCH (c:Condition { name: $condName })
      OPTIONAL MATCH (c)-[:AFFECTS]->(org:OrganSystem)
      OPTIONAL MATCH (med:Medication)-[:TREATS]->(c)
      OPTIONAL MATCH (sym:Symptom)-[:INDICATES]->(c)
      OPTIONAL MATCH (hab:PreventativeHabit)-[:PREVENTS]->(c)
      RETURN c, org, collect(DISTINCT med) as meds, collect(DISTINCT sym) as symptoms, collect(DISTINCT hab) as habits
    `, { condName: matchCondition });

    if (!graphRes || graphRes.length === 0) {
      return Response.json({ found: false, message: "No node matches in ontology graph." });
    }

    const record = graphRes[0];
    const conditionNode = record.get("c")?.properties || {};
    const organNode = record.get("org")?.properties || {};
    const medsList = (record.get("meds") || []).map(m => m.properties);
    const symptomsList = (record.get("symptoms") || []).map(s => s.properties);
    const habitsList = (record.get("habits") || []).map(h => h.properties);

    const nodes = [
      { id: "Condition", label: conditionNode.name || matchCondition, type: "condition", val: 35 },
      { id: "Organ", label: organNode.name || "N/A", type: "organ", val: 25 }
    ];
    const links = [
      { source: "Condition", target: "Organ", relation: "AFFECTS" }
    ];

    medsList.forEach(m => {
      nodes.push({ id: `Med_${m.name}`, label: m.name, type: "medication", val: 20 });
      links.push({ source: `Med_${m.name}`, target: "Condition", relation: "TREATS" });
    });

    symptomsList.forEach(s => {
      nodes.push({ id: `Sym_${s.name}`, label: s.name, type: "symptom", val: 20 });
      links.push({ source: `Sym_${s.name}`, target: "Condition", relation: "INDICATES" });
    });

    habitsList.forEach(h => {
      nodes.push({ id: `Hab_${h.name}`, label: h.name, type: "habit", val: 20 });
      links.push({ source: `Hab_${h.name}`, target: "Condition", relation: "PREVENTS" });
    });

    const finalResponse = {
      found: true,
      neo4j: true,
      condition: conditionNode,
      organ: organNode,
      medications: medsList,
      symptoms: symptomsList,
      habits: habitsList,
      nodes,
      links
    };
    graphCache.set(cacheKey, finalResponse);
    return Response.json(finalResponse);

  } catch (error) {
    console.error("Graph API error:", error);
    return Response.json({ found: false, error: error.message }, { status: 500 });
  }
}

function getMockGraphData(searchName) {
  const q = searchName.toLowerCase().trim();
  const isDiabetes = q.includes("diab") || q.includes("metformin") || q.includes("sugar");
  const isGERD = q.includes("gerd") || q.includes("acid") || q.includes("omeprazole") || q.includes("stomach");
  
  if (isDiabetes) {
    return {
      found: true,
      neo4j: false,
      condition: { name: "Type 2 Diabetes", description: "Metabolic disorder characterized by insulin resistance." },
      organ: { name: "Endocrine System" },
      medications: [{ name: "Metformin 500mg" }],
      symptoms: [{ name: "Fatigue" }, { name: "Frequent Urination" }],
      habits: [{ name: "30-Min Daily Walk" }, { name: "Low-Glycemic Diet" }],
      nodes: [
        { id: "Condition", label: "Type 2 Diabetes", type: "condition", val: 35 },
        { id: "Organ", label: "Endocrine System", type: "organ", val: 25 },
        { id: "Med_Metformin", label: "Metformin 500mg", type: "medication", val: 20 },
        { id: "Sym_Fatigue", label: "Fatigue", type: "symptom", val: 20 },
        { id: "Sym_Urination", label: "Frequent Urination", type: "symptom", val: 20 },
        { id: "Hab_Walk", label: "30-Min Daily Walk", type: "habit", val: 20 },
        { id: "Hab_Diet", label: "Low-Glycemic Diet", type: "habit", val: 20 }
      ],
      links: [
        { source: "Condition", target: "Organ", relation: "AFFECTS" },
        { source: "Med_Metformin", target: "Condition", relation: "TREATS" },
        { source: "Sym_Fatigue", target: "Condition", relation: "INDICATES" },
        { source: "Sym_Urination", target: "Condition", relation: "INDICATES" },
        { source: "Hab_Walk", target: "Condition", relation: "PREVENTS" },
        { source: "Hab_Diet", target: "Condition", relation: "PREVENTS" }
      ]
    };
  }

  if (isGERD) {
    return {
      found: true,
      neo4j: false,
      condition: { name: "GERD (Acid Reflux)", description: "Stomach acid frequently flowing back into the esophagus." },
      organ: { name: "Digestive System" },
      medications: [{ name: "Omeprazole 20mg" }],
      symptoms: [{ name: "Heartburn" }],
      habits: [{ name: "Avoid Late Meals" }],
      nodes: [
        { id: "Condition", label: "GERD (Acid Reflux)", type: "condition", val: 35 },
        { id: "Organ", label: "Digestive System", type: "organ", val: 25 },
        { id: "Med_Omeprazole", label: "Omeprazole 20mg", type: "medication", val: 20 },
        { id: "Sym_Heartburn", label: "Heartburn", type: "symptom", val: 20 },
        { id: "Hab_Meals", label: "Avoid Late Meals", type: "habit", val: 20 }
      ],
      links: [
        { source: "Condition", target: "Organ", relation: "AFFECTS" },
        { source: "Med_Omeprazole", target: "Condition", relation: "TREATS" },
        { source: "Sym_Heartburn", target: "Condition", relation: "INDICATES" },
        { source: "Hab_Meals", target: "Condition", relation: "PREVENTS" }
      ]
    };
  }

  return {
    found: true,
    neo4j: false,
    condition: { name: "Hypertension", description: "Chronic high blood pressure forcing blood against arterial walls." },
    organ: { name: "Cardiovascular System" },
    medications: [{ name: "Lisinopril 10mg" }, { name: "Atorvastatin 20mg" }],
    symptoms: [{ name: "Dizziness" }],
    habits: [{ name: "Low-Sodium Diet" }, { name: "Cardio Exercise" }],
    nodes: [
      { id: "Condition", label: "Hypertension", type: "condition", val: 35 },
      { id: "Organ", label: "Cardiovascular System", type: "organ", val: 25 },
      { id: "Med_Lisinopril", label: "Lisinopril 10mg", type: "medication", val: 20 },
      { id: "Med_Atorvastatin", label: "Atorvastatin 20mg", type: "medication", val: 20 },
      { id: "Sym_Dizzy", label: "Dizziness", type: "symptom", val: 20 },
      { id: "Hab_Salt", label: "Low-Sodium Diet", type: "habit", val: 20 },
      { id: "Hab_Exercise", label: "Cardio Exercise", type: "habit", val: 20 }
    ],
    links: [
      { source: "Condition", target: "Organ", relation: "AFFECTS" },
      { source: "Med_Lisinopril", target: "Condition", relation: "TREATS" },
      { source: "Med_Atorvastatin", target: "Condition", relation: "TREATS" },
      { source: "Sym_Dizzy", target: "Condition", relation: "INDICATES" },
      { source: "Hab_Salt", target: "Condition", relation: "PREVENTS" },
      { source: "Hab_Exercise", target: "Condition", relation: "PREVENTS" }
    ]
  };
}
