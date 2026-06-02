export const MOCK_REPORTS = {
  "prescription-bp": {
    title: "Cardiovascular Prescription (Hypertension)",
    type: "Prescription",
    confidence: 96,
    summary: "This prescription is primarily for managing high blood pressure and controlling cholesterol levels to minimize cardiovascular risk.",
    medicines: [
      {
        name: "Lisinopril 10mg",
        purpose: "Relaxes blood vessels to lower arterial blood pressure and ease cardiac workload.",
        dosage: "1 tablet daily in the morning after breakfast",
        duration: "30 days",
        warning: "Notify your doctor if you develop a dry, tickling cough or experience sudden dizzy spells."
      },
      {
        name: "Atorvastatin 20mg",
        purpose: "Reduces LDL (bad) cholesterol and triglycerides while stabilizing arterial plaques.",
        dosage: "1 tablet daily at bedtime",
        duration: "90 days",
        warning: "Avoid consuming grapefruit juice. Report any unexplained muscle pain or soreness to your doctor immediately."
      }
    ],
    vitals: [],
    general_recommendations: [
      "Restrict daily sodium/salt intake to under 1,500 mg.",
      "Check and record your blood pressure twice weekly in the morning.",
      "Engage in 30 minutes of moderate cardio exercise, like walking, daily."
    ],
    warning_triggers: [
      "Blood pressure exceeds 160/100 mmHg.",
      "Development of persistent ACE-inhibitor dry cough.",
      "Severe muscle pain/soreness."
    ]
  },
  "prescription-diabetes": {
    title: "Endocrine Prescription (Type 2 Diabetes)",
    type: "Prescription",
    confidence: 98,
    summary: "This prescription aims to improve insulin sensitivity, reduce liver glucose production, and control blood sugar levels.",
    medicines: [
      {
        name: "Metformin 500mg (Extended Release)",
        purpose: "Improves insulin efficiency and decreases glucose absorption in the intestines.",
        dosage: "1 tablet twice daily with breakfast and dinner",
        duration: "60 days",
        warning: "May cause minor stomach upset initially. Avoid heavy alcohol intake while on this medication."
      }
    ],
    vitals: [],
    general_recommendations: [
      "Follow a low-glycemic, high-fiber diet rich in green vegetables.",
      "Perform a 15-minute gentle walk immediately after meals to lower post-prandial spikes.",
      "Monitor fasting blood sugar daily and target under 100 mg/dL."
    ],
    warning_triggers: [
      "Fasting blood glucose levels consistently exceed 180 mg/dL.",
      "Symptoms of hypoglycemia (sweating, shaking, confusion) occurring frequently."
    ]
  },
  "report-blood": {
    title: "Comprehensive Metabolic & Lipid Panel",
    type: "Lab Report",
    confidence: 97,
    summary: "This metabolic lab panel indicates elevated blood glucose, long-term glycemic markers, and LDL cholesterol, signaling pre-diabetic cardiorisk states.",
    medicines: [],
    vitals: [
      {
        name: "Fasting Blood Glucose",
        value: "132 mg/dL",
        range: "70 - 99 mg/dL",
        status: "High",
        explanation: "Concentration of sugar in the blood after 8 hours of fasting. Elevated readings indicate impaired glucose tolerance or diabetes."
      },
      {
        name: "HbA1c (Glycated Hemoglobin)",
        value: "7.2%",
        range: "4.0% - 5.6%",
        status: "High",
        explanation: "Average blood sugar levels over the last 3 months. Readings above 6.5% confirm active diabetic states."
      },
      {
        name: "LDL Cholesterol",
        value: "158 mg/dL",
        range: "0 - 99 mg/dL",
        status: "High",
        explanation: "Low-Density Lipoprotein (bad cholesterol). Excess levels form fatty plaques inside coronary arteries."
      },
      {
        name: "Hemoglobin",
        value: "14.2 g/dL",
        range: "12.0 - 16.0 g/dL",
        status: "Nominal",
        explanation: "Oxygen-carrying protein in red blood cells. Normal readings indicate absence of anemia."
      }
    ],
    general_recommendations: [
      "Consult an endocrinologist for custom glycemic management.",
      "Significantly reduce intake of simple sugars, refined flours, and sweet sodas.",
      "Repeat lipid panel and HbA1c tests in 6 weeks to monitor progress."
    ],
    warning_triggers: [
      "HbA1c rises above 8.0%.",
      "Experiencing chest pain or shortness of breath on exertion."
    ]
  }
};

export const MEDICAL_FALLBACK = (query) => ({
  title: query ? `Diagnostic Report (${query})` : "General Health Consultation",
  type: "Prescription",
  confidence: 85,
  summary: `Patient consultation concerning: "${query || "general health Checkup"}". Jargon parsed into layman advice below.`,
  medicines: [
    {
      name: "Omeprazole 20mg",
      purpose: "Reduces excess stomach acid production to protect the esophageal lining.",
      dosage: "1 capsule daily in the morning, 30 minutes before your first meal",
      duration: "14 days",
      warning: "Avoid eating spicy foods, citrus, or late-night dinners."
    }
  ],
  vitals: [],
  general_recommendations: [
    "Schedule an in-person follow-up with your physician.",
    "Ensure 7-8 hours of restful sleep daily to aid systemic recovery.",
    "Drink at least 2.5 liters of clean water daily."
  ],
  warning_triggers: [
    "Symptoms fail to improve within 7 days.",
    "Onset of fever, severe stomach spasms, or vomiting."
  ]
});

export function getMockMedicalResponse(query) {
  const q = query.toLowerCase().trim();

  if (q.includes("blood") || q.includes("report") || q.includes("glucose") || q.includes("cholesterol") || q.includes("lab")) {
    return MOCK_REPORTS["report-blood"];
  }
  if (q.includes("diabetes") || q.includes("sugar") || q.includes("metformin") || q.includes("sugar medication")) {
    return MOCK_REPORTS["prescription-diabetes"];
  }
  if (q.includes("bp") || q.includes("pressure") || q.includes("hypertension") || q.includes("heart") || q.includes("cardiac") || q.includes("lisinopril") || q.includes("atorvastatin")) {
    return MOCK_REPORTS["prescription-bp"];
  }

  // Fallback to random report for realism in camera scan
  const keys = Object.keys(MOCK_REPORTS);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return MOCK_REPORTS[randomKey];
}
