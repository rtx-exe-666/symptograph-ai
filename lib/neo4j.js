import neo4j from "neo4j-driver";

let driver;

export function getNeo4jDriver() {
  if (
    !driver &&
    process.env.NEO4J_URI &&
    process.env.NEO4J_URI !== "your_neo4j_uri_here" &&
    process.env.NEO4J_PASSWORD
  ) {
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(
        process.env.NEO4J_USERNAME || "neo4j",
        process.env.NEO4J_PASSWORD
      ),
      {
        maxConnectionLifetime: 3 * 60 * 1000,       // 3 min
        maxConnectionPoolSize: 10,
        connectionAcquisitionTimeout: 8000,          // 8 sec timeout (Vercel functions)
        connectionTimeout: 10000,                    // 10 sec socket timeout
        disableLosslessIntegers: true,               // Return plain JS numbers, not Neo4j Integer objects
        logging: neo4j.logging.console(
          process.env.NODE_ENV === "development" ? "debug" : "warn"
        ),
      }
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

/** Lightweight connectivity ping — call once at startup to confirm reachability */
export async function verifyNeo4jConnection() {
  const drv = getNeo4jDriver();
  if (!drv) return false;
  try {
    await drv.verifyConnectivity({ database: "neo4j" });
    return true;
  } catch (err) {
    console.error("[neo4j] Connection verification failed:", err.message);
    return false;
  }
}

export async function runQuery(cypher, params = {}) {
  const drv = getNeo4jDriver();
  if (!drv) return null;
  const session = drv.session({ database: "neo4j" });
  try {
    const res = await session.run(cypher, params);
    return res.records;
  } catch (err) {
    console.error("[neo4j] Query error:", err.message, "\nCypher:", cypher);
    throw err;
  } finally {
    await session.close();
  }
}
