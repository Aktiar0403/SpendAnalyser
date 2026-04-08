import { google } from 'googleapis';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  if (!req.headers.tokens) return res.status(401).json({ error: "No tokens provided" });

  try {
    const tokens = JSON.parse(req.headers.tokens);
    const oauth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET);
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // BROADENED SEARCH: Includes the old "googleplay-noreply" and "payments-noreply" addresses
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:(googleplay-noreply@google.com OR payments-noreply@google.com) "Google Play"',
      maxResults: 600 // Increased slightly for 5 years
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

        // --- THE "SILVER BULLET" APP NAME SCRAPER ---
        let appName = "";
        
        // 1. Look for the Play Store link (This is the most reliable across all years)
        const playStoreLink = $("a[href*='details?id=']").first();
        if (playStoreLink.length) {
            appName = playStoreLink.text().trim();
        }

        // 2. Fallback for Subscriptions (often in a bold header or specific table cell)
        if (!appName || appName.length < 2) {
            appName = $("td:contains('Description')").next('td').text().trim() || 
                      $("td:contains('Item')").next('td').text().trim();
        }

        // 3. Last resort: Clean the subject line if the body is unreadable
        if (!appName || appName.length < 2) {
            const subject = details.data.payload.headers.find(h => h.name === 'Subject')?.value || "";
            appName = subject.replace(/Your Google Play Order Receipt from/i, "").trim();
        }

        // --- AMOUNT EXTRACTION (Supports commas and ₹) ---
        const amountMatch = body.match(/₹\s?([0-9,]+\.?\d*)/);
        
        if (amountMatch) {
          const cleanAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (!isNaN(cleanAmount) && cleanAmount > 0) {
            transactions.push({
              id: msg.id,
              date: new Date(parseInt(details.data.internalDate)).toLocaleDateString(),
              rawDate: parseInt(details.data.internalDate), // for sorting
              amount: cleanAmount,
              app: appName || "Google Play Purchase"
            });
          }
        }
      } catch (err) {
        continue;
      }
    }

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}