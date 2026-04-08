import { google } from 'googleapis';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (!req.headers.tokens) return res.status(401).json({ error: "No tokens provided" });

  try {
    const tokens = JSON.parse(req.headers.tokens);
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 1. Fetch list (Cap at 500 for timeout safety)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:googleplay-noreply@google.com OR "Google Play Order Receipt"',
      maxResults: 500 
    });

    const messages = response.data.messages || [];
    const transactions = [];

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

        const body = Buffer.from(rawData, 'base64').toString('utf-8');
        const $ = cheerio.load(body);

        // --- ENHANCED SCRAPER ---
        let appName = "";
        
        // Strategy A: Check for the actual Play Store link text
        const playLink = $("a[href*='details?id=']").first().text().trim();
        
        // Strategy B: Look for specific table cells that usually hold the item name
        const itemCell = $("td:contains('Item')").next('td').text().trim();
        
        // Strategy C: Check for common subscription patterns
        const subTitle = $("h2").first().text().trim();

        appName = playLink || itemCell || subTitle || "Google Play Purchase";
        
        // Clean up common noise in the app name
        appName = appName.split(" - ")[0].split(" (")[0].replace(/Order Receipt/i, "").trim();

        // --- AMOUNT EXTRACTION ---
        const amountMatch = body.match(/₹\s?([0-9,]+\.?\d*)/);
        
        if (amountMatch) {
          const cleanAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (!isNaN(cleanAmount) && cleanAmount > 0) {
            transactions.push({
              id: msg.id,
              date: new Date(parseInt(details.data.internalDate)).toLocaleDateString(),
              amount: cleanAmount,
              app: appName.substring(0, 60)
            });
          }
        }
      } catch (err) {
        console.error("Skipped msg:", msg.id);
        continue;
      }
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}