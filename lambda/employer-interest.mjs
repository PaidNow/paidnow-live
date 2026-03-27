import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const db = new DynamoDBClient({ region: "af-south-1" });
const ses = new SESClient({ region: "af-south-1" });

const ALLOWED_ORIGIN = "https://paidnow.live";
const TABLE = "paidnow-employer-leads";
const NOTIFY_EMAIL = "info@paidnow.live";
const MAX_BODY = 4096;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_SIZES = ["1-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+"];
const VALID_PAYROLLS = ["Sage", "PaySpace", "SimplePay", "Labournet", "Xero", "SAP SuccessFactors", "Workday", "CRS HRpro", "Payroll Hub", "SmartPay", "Other", "Not sure"];
const VALID_ROLES = ["HR / People", "Finance / CFO", "Operations", "CEO / Founder", "Other"];
const VALID_INDUSTRIES = ["Retail", "Hospitality", "Manufacturing", "Logistics & Warehousing", "Healthcare", "Construction", "Agriculture", "Mining", "Security", "Cleaning & Facilities", "BPO & Call Centres", "Financial Services", "Technology", "Education", "Government & Public Sector", "Other"];
const FREEMAIL_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "mail.com", "aol.com", "protonmail.com", "zoho.com", "yandex.com", "live.com", "msn.com"];

const headers = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

const respond = (statusCode, message) => ({
  statusCode,
  headers,
  body: JSON.stringify({ message }),
});

const sanitise = (str, max) => str.trim().slice(0, max).replace(/[<>]/g, "");

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (method !== "POST") return respond(405, "Method not allowed");

  const origin = event.headers?.origin || event.headers?.Origin || "";
  if (origin && origin !== ALLOWED_ORIGIN) return respond(403, "Forbidden");

  const rawBody = event.body || "";
  if (rawBody.length > MAX_BODY) return respond(413, "Payload too large");

  let body;
  try { body = JSON.parse(rawBody); } catch { return respond(400, "Invalid JSON"); }

  // Extract and sanitise fields
  const name = sanitise(body.name || "", 100);
  const email = (body.email || "").trim().toLowerCase().slice(0, 254);
  const phone = (body.phone || "").replace(/[^0-9+\- ]/g, "").slice(0, 20);
  const company = sanitise(body.company || "", 150);
  const industry = body.industry || "";
  const role = body.role || "";
  const size = body.size || "";
  const payroll = body.payroll || "";
  const message = sanitise(body.message || "", 500);

  // UTM tracking
  const utm = body.utm || {};
  const utmSource = sanitise(String(utm.source || ""), 100);
  const utmMedium = sanitise(String(utm.medium || ""), 100);
  const utmCampaign = sanitise(String(utm.campaign || ""), 100);

  // Validate required fields
  if (!name || !email || !company || !industry || !role || !size || !payroll) {
    return respond(400, "Missing required fields");
  }
  if (!EMAIL_RE.test(email)) return respond(400, "Invalid email");
  if (FREEMAIL_DOMAINS.includes(email.split("@")[1])) {
    return respond(400, "Please use your work email address");
  }

  // Validate enum fields
  if (!VALID_ROLES.includes(role)) return respond(400, "Invalid role selection");
  if (!VALID_INDUSTRIES.includes(industry)) return respond(400, "Invalid industry selection");
  if (!VALID_SIZES.includes(size)) return respond(400, "Invalid company size");
  if (!VALID_PAYROLLS.includes(payroll)) return respond(400, "Invalid payroll selection");

  // Build DynamoDB item
  const item = {
    email: { S: email },
    name: { S: name },
    company: { S: company },
    industry: { S: industry },
    role: { S: role },
    size: { S: size },
    payroll: { S: payroll },
    submittedAt: { S: new Date().toISOString() },
    status: { S: "new" },
  };
  if (phone) item.phone = { S: phone };
  if (message) item.message = { S: message };
  if (utmSource) item.utmSource = { S: utmSource };
  if (utmMedium) item.utmMedium = { S: utmMedium };
  if (utmCampaign) item.utmCampaign = { S: utmCampaign };

  // Write to DynamoDB
  try {
    await db.send(new PutItemCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(email)",
    }));
  } catch (e) {
    if (e.name === "ConditionalCheckFailedException") {
      return respond(200, "We already have your details. You're on the list.");
    }
    throw e;
  }

  // Send notification email
  try {
    await ses.send(new SendEmailCommand({
      Source: NOTIFY_EMAIL,
      Destination: { ToAddresses: [NOTIFY_EMAIL] },
      Message: {
        Subject: { Data: `New employer lead: ${company}` },
        Body: {
          Text: {
            Data: [
              `Name: ${name}`,
              `Email: ${email}`,
              phone ? `Phone: ${phone}` : "",
              `Company: ${company}`,
              `Industry: ${industry}`,
              `Role: ${role}`,
              `Size: ${size}`,
              `Payroll: ${payroll}`,
              message ? `Message: ${message}` : "",
              utmSource ? `UTM Source: ${utmSource}` : "",
              utmMedium ? `UTM Medium: ${utmMedium}` : "",
              utmCampaign ? `UTM Campaign: ${utmCampaign}` : "",
            ].filter(Boolean).join("\n"),
          },
        },
      },
    }));
  } catch {
    // Don't fail the request if notification fails
  }

  return respond(200, "Success");
};
