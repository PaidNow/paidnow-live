import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "af-south-1" });
const ALLOWED_ORIGIN = "https://paidnow.live";
const MAX_BODY = 1024;
const MAX_EMAIL = 254;

const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (method !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ message: "Method not allowed" }) };
  }

  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (origin && origin !== ALLOWED_ORIGIN) {
    return { statusCode: 403, headers, body: JSON.stringify({ message: "Forbidden" }) };
  }

  const rawBody = event.body || "";
  if (rawBody.length > MAX_BODY) {
    return { statusCode: 413, headers, body: JSON.stringify({ message: "Payload too large" }) };
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid JSON" }) };
  }

  const email = (body.email || "").trim().toLowerCase();

  if (!email || email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ message: "Invalid email" }) };
  }

  await client.send(new PutItemCommand({
    TableName: "paidnow-waitlist",
    Item: {
      email: { S: email },
      joinedAt: { S: new Date().toISOString() },
    },
    ConditionExpression: "attribute_not_exists(email)",
  })).catch(e => {
    if (e.name !== "ConditionalCheckFailedException") throw e;
  });

  return { statusCode: 200, headers, body: JSON.stringify({ message: "Success" }) };
};
