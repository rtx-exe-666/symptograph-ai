import { seedMedicalGraph } from "@/lib/seedMedicalGraph";
import { isNeo4jConfigured } from "@/lib/neo4j";

export async function GET() {
  if (!isNeo4jConfigured()) {
    return Response.json(
      { error: "Neo4j database credentials are not configured in environment variables." },
      { status: 400 }
    );
  }

  try {
    const res = await seedMedicalGraph();
    return Response.json({ success: true, seededNodes: res.count, message: "Medical Ontology Graph seeded successfully!" });
  } catch (error) {
    return Response.json(
      { error: "Failed to seed medical database.", details: error.message },
      { status: 500 }
    );
  }
}
