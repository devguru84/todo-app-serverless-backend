// src/utils/response.ts
import { APIGatewayProxyResult } from "aws-lambda";

export const formatResponse = (
  statusCode: number,
  body: any
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
    },
    body: JSON.stringify(body),
  };
};
