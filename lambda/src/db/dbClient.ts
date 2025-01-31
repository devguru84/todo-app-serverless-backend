// src/db/dbClient.ts
import { Client } from "pg";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const secretsManager = new SecretsManagerClient({ region: "us-east-2" }); // Change region as needed

async function getDatabaseCredentials(): Promise<any> {
  const secretArn = process.env.DB_SECRET_ARN;

  try {
    const secretData = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: secretArn })
    );
    if (!secretData.SecretString) throw new Error("SecretString is undefined");

    return JSON.parse(secretData.SecretString);
  } catch (error) {
    console.error("Error fetching secret:", error);
    throw new Error("Failed to retrieve database credentials");
  }
}

// Create and export a reusable PostgreSQL client connection
export const createDbClient = async () => {
  const credentials = await getDatabaseCredentials();

  const client = new Client({
    host: credentials.host,
    port: credentials.port,
    database: "postgres",
    user: credentials.username,
    password: credentials.password,
    ssl: { rejectUnauthorized: false }, // Assuming you need SSL for Lambda
  });

  return client;
};

const ensureTableExists = async () => {
  const client = await createDbClient();

  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      todo TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table "todos" checked/created.');
  await client.end();
};

// Ensure table creation when Lambda starts (cold start only)
ensureTableExists().catch(console.error);
