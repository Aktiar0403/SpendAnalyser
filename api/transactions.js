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
      q: 'from:payments-noreply@google.com "Google Play"',
      maxResults: 50
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

        // Use base64url decoding (Gmail specific)
        const body = Buffer.from(rawData, 'base64').toString('utf-8');
        const $ = cheerio.load(body);

        // 4. Advanced Parsing Logic
        // Look for amount: supports ₹ 100, ₹100.00, and 100.00
        const amountMatch = body.match(/₹\s?([0-9,]+\.?\d*)/);
        
        // Look for App Name: usually in the first <span> or within a specific <td>
        let appName = "Google Play Purchase";
        
        // Strategy A: Find the text near "Transaction date"
        const appCell = $("td:contains('App')").next('td').text().trim();
        if (appCell) {
            appName = appCell;
        } else {
            // Strategy B: Get the first bold/significant text
            const firstSpan = $("span").first().text().trim();
            if (firstSpan && firstSpan.length > 2) appName = firstSpan;
        }

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