// src/index.ts
import { APIGatewayEvent, Context } from "aws-lambda";
import { getAllTodosHandler, addNewTodoHandler } from "./handlers/apiHandler";
import { formatResponse } from "./utils/response";

// Main Lambda handler function
export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<any> => {
  if (event.httpMethod === "GET" && event.path === "/todos") {
    return getAllTodosHandler(event);
  }

  if (event.httpMethod === "POST" && event.path === "/todos") {
    return addNewTodoHandler(event);
  }

  return formatResponse(500, { message: "Not Found" });
};
