// src/db/dbQueries.ts
import { Client } from "pg";
import { createDbClient } from "./dbClient";

export const fetchAllTodos = async (): Promise<any[]> => {
  const client = await createDbClient();

  try {
    await client.connect();
    const result = await client.query("SELECT * FROM todos");
    return result.rows;
  } catch (err) {
    console.error("Database query failed", err);
    throw new Error("Unable to fetch rows from the database");
  } finally {
    await client.end();
  }
};

export const insertTodo = async (todoText: string): Promise<any> => {
  const client = await createDbClient();

  try {
    await client.connect();
    const result = await client.query(
      "INSERT INTO todos (todo) VALUES ($1) RETURNING *",
      [todoText]
    );
    return result.rows[0]; // Return the inserted row
  } catch (err) {
    console.error("Database insert failed", err);
    throw new Error("Unable to insert todo into the database");
  } finally {
    await client.end();
  }
};
