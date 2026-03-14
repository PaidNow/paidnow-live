import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "af-south-1" });

export const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const email = (body.email || "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: cors(), body: JSON.stringify({ message: "Invalid email" }) };
  }

  await client.send(new PutItemCommand({
    TableName: "paidnow-waitlist",
    Item: {
      email: { S: email },
      joinedAt: { S: new Date().toISOString() }
    },
    ConditionExpression: "attribute_not_exists(email)"
  })).catch(e => {
    if (e.name !== "ConditionalCheckFailedException") throw e;
  });

  return { statusCode: 200, headers: cors(), body: JSON.stringify({ message: "Success" }) };
};

const cors = () => ({
  "Access-Control-Allow-Origin": "https://paidnow.live",
  "Access-Control-Allow-Headers": "Content-Type"
});
