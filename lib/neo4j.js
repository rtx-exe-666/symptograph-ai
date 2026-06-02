import neo4j from "neo4j-driver";

let driver;

export function getNeo4jDriver() {
  if (!driver && process.env.NEO4J_URI && process.env.NEO4J_URI !== "your_neo4j_uri_here") {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
    );
  }
  return driver;
}

export function isNeo4jConfigured() {
  return !!(
    process.env.NEO4J_URI &&
    process.env.NEO4J_URI !== "your_neo4j_uri_here" &&
    process.env.NEO4J_PASSWORD
  );
}

export async function runQuery(cypher, params = {}) {
  const drv = getNeo4jDriver();
  if (!drv) return null;
  const session = drv.session();
  try {
    const res = await session.run(cypher, params);
    return res.records;
  } finally {
    await session.close();
  }
}
