// src/handlers/apiHandler.ts
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import { fetchAllTodos, insertTodo } from "../db/dbQueries";
import { formatResponse } from "../utils/response";

// Handle GET request for fetching all rows
export const getAllTodosHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const todos = await fetchAllTodos();
    return formatResponse(200, { todos });
  } catch (err) {
    return formatResponse(500, {
      message: "Error fetching rows from database",
    });
  }
};

export const addNewTodoHandler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { value } = body; // Extract todo text from request body

    if (!value) {
      return formatResponse(400, { message: "Todo value is required" });
    }

    const newTodo = await insertTodo(value);
    return formatResponse(201, { newTodo });
  } catch (err) {
    return formatResponse(500, { message: "Error adding new todo" });
  }
};
