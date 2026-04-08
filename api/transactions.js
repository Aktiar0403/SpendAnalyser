import { google } from 'googleapis';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // 1. Safety check for tokens
  if (!req.headers.tokens) {
    return res.status(401).json({ error: "No tokens provided" });
  }

  try {
    const tokens = JSON.parse(req.headers.tokens);
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET
    );
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // 2. Fetch the list of messages
   const response = await gmail.users.messages.list({
  userId: 'me',
  q: 'from:googleplay-noreply@google.com OR "Google Play Order Receipt"',
  maxResults: 5000 // Increased to capture several years of history
});

    const messages = response.data.messages || [];
    const transactions = [];

    // 3. Helper function to find body in nested Gmail parts
    const getBody = (payload) => {
      if (payload.body?.data) return payload.body.data;
      if (payload.parts) {
        for (const part of payload.parts) {
          const result = getBody(part);
          if (result) return result;
        }
      }
      return null;
    };

    for (const msg of messages) {
      try {
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const rawData = getBody(details.data.payload);
        
        if (!rawData) continue;

       // Inside the for (const msg of messages) loop in api/transactions.js

const body = Buffer.from(rawData, 'base64').toString('utf-8');
const $ = cheerio.load(body);

// --- IMPROVED APP NAME EXTRACTION ---
let appName = "";

// Strategy A: Most common Google Play layout (Inside a link or strong tag)
appName = $("a[href*='details?id=']").first().text().trim();

// Strategy B: Tablet layout (Inside a specific TD after "Item")
if (!appName) {
  appName = $("td:contains('Item')").next('td').text().trim();
}

// Strategy C: Subscription layout
if (!appName) {
  appName = $("td").find("span").filter(function() {
    return $(this).text().length > 2 && $(this).text().length < 50;
  }).first().text().trim();
}

// Fallback if all else fails
if (!appName || appName.includes("Order Number")) {
  appName = "Google Play Purchase";
}

// --- IMPROVED AMOUNT EXTRACTION ---
// This regex handles ₹1,200.50, ₹ 50, etc.
const amountMatch = body.match(/₹\s?([0-9,]+\.?\d*)/);
const cleanAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;
        if (amountMatch) {
          const cleanAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (!isNaN(cleanAmount)) {
            transactions.push({
              id: msg.id,
              date: new Date(parseInt(details.data.internalDate)).toLocaleDateString(),
              amount: cleanAmount,
              app: appName.substring(0, 50) // Cap length
            });
          }
        }
      } catch (msgError) {
        console.error(`Skipping message ${msg.id}:`, msgError.message);
        continue; // Don't crash the whole API if one email is weird
      }
    }

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Global API Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}